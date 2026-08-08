import React, { useState, useEffect, useRef } from "react";
import { Download, Github, Shield, ListChecks, Search, SunMoon, Terminal, Info } from "lucide-react";

const PY_SOURCE = `"""
Roblox Crash Watchdog - GUI version (modern hand-styled theme)
------------------------------------------------------------------
A small desktop app that:
  - Lets you save a list of games (name + Place ID / link)
  - Lets you pick which one to watch from a list
  - Starts/stops a background watchdog that relaunches Roblox into that
    game if it closes or crashes
  - Shows a live log in the window

Only dependency: psutil.
    pip install psutil

Run:
    python roblox_watchdog_gui.py
"""

import json
import os
import re
import subprocess
import sys
import threading
import time
import tkinter as tk
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from queue import Empty, Queue
from tkinter import messagebox, ttk

try:
    import psutil
except ImportError:
    raise SystemExit(
        "This app requires the 'psutil' package.\\nInstall it with:  pip install psutil"
    )


def app_dir() -> Path:
    """Folder to store config/log files in. Always uses a fixed location
    under %LOCALAPPDATA% so your saved games/log stay put regardless of
    where the .py or .exe is run from or moved to."""
    data_dir = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "RoRejoinX"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
    return data_dir


def resource_path(name: str) -> Path:
    """Folder for bundled assets (icons). When frozen by PyInstaller with
    --add-data, these live in the temp extraction folder (sys._MEIPASS),
    not next to the exe -- unlike user data, which uses app_dir()."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
    return base / name


APP_NAME = "RoRejoinX"
APP_VERSION = "v1.0.0"
CREDITS = "AXTS"
ICON_ICO = resource_path("RoRejoinX.ico")
ICON_TITLEBAR = resource_path("RoRejoinX_24.png")


# ---------------- Configuration ----------------
PROCESS_NAME = "RobloxPlayerBeta.exe"
LAUNCHER_NAME = "RobloxPlayerLauncher.exe"
VERSIONS_DIR = Path(os.environ.get("LOCALAPPDATA", "")) / "Roblox" / "Versions"
POLL_INTERVAL = 1.5
RELAUNCH_DELAY = 4
STARTUP_TIMEOUT = 30
MAX_RETRIES_PER_WINDOW = 5
RETRY_WINDOW_SECONDS = 300
CONFIG_FILE = app_dir() / "rorejoinx_saved_games.json"
LOG_FILE = app_dir() / "rorejoinx_log.txt"
SETTINGS_FILE = app_dir() / "rorejoinx_settings.json"

DEFAULT_GAMES = [
    {"name": "Anime Expeditions", "place_id": "84515722934860"},
]

# ---------------- Color palettes ----------------
THEMES = {
    "dark": {
        "bg": "#0e0e16",
        "sidebar": "#12121c",
        "card": "#191925",
        "card_alt": "#20202f",
        "border": "#2a2a3d",
        "accent": "#7c5cff",
        "accent_hover": "#8f72ff",
        "text": "#f2f2f7",
        "subtext": "#8f8fa8",
        "success": "#3ddc84",
        "danger": "#ff5c6c",
    },
    "light": {
        "bg": "#f4f4f9",
        "sidebar": "#ffffff",
        "card": "#ffffff",
        "card_alt": "#f0f0f6",
        "border": "#e2e2ec",
        "accent": "#7c5cff",
        "accent_hover": "#6a48f0",
        "text": "#1c1c28",
        "subtext": "#6b6b80",
        "success": "#1fae66",
        "danger": "#e0394f",
    },
}

C = dict(THEMES["dark"])  # mutated in place on theme switch; widgets re-read from this dict
# -------------------------------------------------


def find_launcher():
    root = VERSIONS_DIR.parent
    if not root.exists():
        return None
    launcher_candidates = list(root.rglob(LAUNCHER_NAME))
    if launcher_candidates:
        return max(launcher_candidates, key=lambda p: p.stat().st_mtime)
    player_candidates = list(root.rglob(PROCESS_NAME))
    if player_candidates:
        return max(player_candidates, key=lambda p: p.stat().st_mtime)
    return None


def find_roblox_process():
    for proc in psutil.process_iter(["name"]):
        try:
            if proc.info["name"] and proc.info["name"].lower() == PROCESS_NAME.lower():
                return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None


def extract_place_id(text: str):
    text = text.strip()
    if text.isdigit():
        return text
    match = re.search(r"/games/(\\d+)", text)
    if match:
        return match.group(1)
    return None


def fetch_roblox_game_name(place_id: str, timeout=6):
    """Look up a game's display name from a Place ID via Roblox's public
    API. Returns None on any failure (offline, invalid ID, API change,
    etc.) so callers can fall back to asking the user to type it in."""
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        req = urllib.request.Request(
            f"https://apis.roblox.com/universes/v1/places/{place_id}/universe",
            headers=headers,
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            universe_id = json.loads(resp.read().decode()).get("universeId")
        if not universe_id:
            return None

        req2 = urllib.request.Request(
            f"https://games.roblox.com/v1/games?universeIds={universe_id}",
            headers=headers,
        )
        with urllib.request.urlopen(req2, timeout=timeout) as resp2:
            games = json.loads(resp2.read().decode()).get("data", [])
        if games:
            return games[0].get("name")
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, OSError):
        return None
    return None


class WatchdogWorker:
    """Runs the watchdog loop in a background thread."""

    def __init__(self, place_id: str, game_name: str, log_queue: Queue, status_cb):
        self.place_id = place_id
        self.game_name = game_name
        self.uri = f"roblox://placeId={place_id}"
        self.log_queue = log_queue
        self.status_cb = status_cb
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self.thread.start()

    def stop(self):
        self.stop_event.set()

    def _log(self, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{timestamp}] {message}"
        self.log_queue.put(line)
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line + "\\n")
        except OSError:
            pass

    def _launch(self):
        self._log(f"Launching Roblox into {self.game_name} (Place ID {self.place_id})...")
        launcher = find_launcher()
        if launcher:
            subprocess.Popen([str(launcher), self.uri])
        else:
            self._log("Could not find a Roblox executable to launch. "
                       "Falling back to the roblox:// link.")
            os.startfile(self.uri)

    def _wait_for_start(self, timeout=STARTUP_TIMEOUT):
        start = time.time()
        while time.time() - start < timeout:
            if self.stop_event.is_set():
                return None
            proc = find_roblox_process()
            if proc:
                return proc
            time.sleep(1)
        return None

    def _wait_for_exit(self, proc):
        while not self.stop_event.is_set():
            if not proc.is_running():
                return True
            try:
                if proc.status() == psutil.STATUS_ZOMBIE:
                    return True
            except psutil.NoSuchProcess:
                return True
            time.sleep(POLL_INTERVAL)
        return False

    def _run(self):
        self._log(f"=== Watchdog started for '{self.game_name}' ===")
        self.status_cb("running")
        retry_timestamps = []

        proc = find_roblox_process()
        if not proc:
            self._launch()
            proc = self._wait_for_start()
            if self.stop_event.is_set():
                self._log("Stopped before Roblox finished starting.")
                self.status_cb("stopped")
                return
            if not proc:
                self._log("Roblox did not start within the timeout. Check your installation.")
                self.status_cb("stopped")
                return
            self._log(f"Roblox started (PID {proc.pid}).")
        else:
            self._log(f"Roblox already running (PID {proc.pid}). Watching it.")

        while True:
            self._wait_for_exit(proc)
            if self.stop_event.is_set():
                self._log("Watchdog stopped by user.")
                self.status_cb("stopped")
                return

            self._log("Roblox process exited.")

            now = time.time()
            retry_timestamps[:] = [t for t in retry_timestamps if now - t < RETRY_WINDOW_SECONDS]
            if len(retry_timestamps) >= MAX_RETRIES_PER_WINDOW:
                self._log(f"Hit max relaunch limit ({MAX_RETRIES_PER_WINDOW} in "
                          f"{RETRY_WINDOW_SECONDS // 60} min). Stopping to avoid a crash loop.")
                self.status_cb("stopped")
                return

            self._log(f"Waiting {RELAUNCH_DELAY}s before relaunching...")
            for _ in range(RELAUNCH_DELAY * 2):
                if self.stop_event.is_set():
                    self._log("Watchdog stopped by user.")
                    self.status_cb("stopped")
                    return
                time.sleep(0.5)

            retry_timestamps.append(time.time())
            self._launch()
            proc = self._wait_for_start()
            if self.stop_event.is_set():
                self._log("Watchdog stopped by user.")
                self.status_cb("stopped")
                return
            if not proc:
                self._log("Roblox did not come back up after the relaunch attempt.")
                self.status_cb("stopped")
                return
            self._log(f"Roblox relaunched (PID {proc.pid}). Resuming watch.")


def strip_native_titlebar(root: tk.Tk):
    """Remove the OS title bar/frame using overrideredirect (set at window
    creation time -- this is the reliable way to do it; editing an already-
    shown window's style via SetWindowLongW instead causes DWM compositor
    corruption/ghosting during drags). Taskbar + Alt+Tab visibility, which
    overrideredirect normally drops, is restored separately below."""
    root.overrideredirect(True)
    try:
        import ctypes
        GWL_EXSTYLE = -20
        WS_EX_APPWINDOW = 0x00040000
        WS_EX_TOOLWINDOW = 0x00000080

        root.update_idletasks()
        hwnd = ctypes.windll.user32.GetParent(root.winfo_id())
        style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        style = (style & ~WS_EX_TOOLWINDOW) | WS_EX_APPWINDOW
        ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)

        # Re-showing the window is required for the taskbar to pick up the
        # extended-style change.
        root.withdraw()
        root.after(10, root.deiconify)
        return True
    except Exception:
        return False


class TitleBar(tk.Frame):
    """Custom draggable title bar with app icon, name, minimize and close.
    Works for both the main window and borderless dialogs (set
    show_minimize=False and target=dialog for the latter)."""

    def __init__(self, master, app_title, on_close, icon_photo=None,
                 show_minimize=True, target=None):
        super().__init__(master, bg=C["sidebar"], height=36)
        self.pack_propagate(False)
        self.master_root = target if target is not None else master
        self._drag_start = None

        left = tk.Frame(self, bg=C["sidebar"])
        left.pack(side="left", fill="y", padx=(12, 0))
        if icon_photo is not None:
            tk.Label(left, image=icon_photo, bg=C["sidebar"]).pack(side="left", pady=6)
            self._icon_ref = icon_photo  # keep a reference
        tk.Label(left, text=f"  {app_title}", bg=C["sidebar"], fg=C["text"],
                  font=("Segoe UI", 10, "bold")).pack(side="left")

        right = tk.Frame(self, bg=C["sidebar"])
        right.pack(side="right", fill="y")
        close_btn = tk.Label(right, text="✕", bg=C["sidebar"], fg=C["subtext"],
                              font=("Segoe UI", 11), width=4, cursor="hand2")
        close_btn.pack(side="right", fill="y")
        close_btn.bind("<Button-1>", lambda e: on_close())
        close_btn.bind("<Enter>", lambda e: close_btn.config(bg=C["danger"], fg="#ffffff"))
        close_btn.bind("<Leave>", lambda e: close_btn.config(bg=C["sidebar"], fg=C["subtext"]))

        if show_minimize:
            min_btn = tk.Label(right, text="—", bg=C["sidebar"], fg=C["subtext"],
                                font=("Segoe UI", 11), width=4, cursor="hand2")
            min_btn.pack(side="right", fill="y")
            min_btn.bind("<Button-1>", lambda e: self.master_root.iconify())
            min_btn.bind("<Enter>", lambda e: min_btn.config(bg=C["card_alt"], fg=C["text"]))
            min_btn.bind("<Leave>", lambda e: min_btn.config(bg=C["sidebar"], fg=C["subtext"]))

        for widget in (self, left, right):
            widget.bind("<ButtonPress-1>", self._start_drag)
            widget.bind("<B1-Motion>", self._do_drag)

    def _start_drag(self, event):
        self._drag_start = (event.x_root, event.y_root,
                             self.master_root.winfo_x(), self.master_root.winfo_y())

    def _do_drag(self, event):
        if not self._drag_start:
            return
        sx, sy, wx, wy = self._drag_start
        dx, dy = event.x_root - sx, event.y_root - sy
        self.master_root.geometry(f"+{wx + dx}+{wy + dy}")


class SidebarButton(tk.Label):
    """A flat icon button used in the left rail. Hand-styled, no ttk needed."""

    def __init__(self, master, icon, tooltip, command, **kwargs):
        super().__init__(
            master, text=icon, font=("Segoe UI Emoji", 16),
            bg=C["sidebar"], fg=C["subtext"], width=3, height=1, cursor="hand2",
            **kwargs,
        )
        self.command = command
        self.tooltip = tooltip
        self.active = False
        self.bind("<Button-1>", lambda e: self.command())
        self.bind("<Enter>", lambda e: self.config(fg=C["text"]))
        self.bind("<Leave>", lambda e: self.config(fg=C["text"] if self.active else C["subtext"]))

    def set_active(self, active: bool):
        self.active = active
        self.config(fg=C["accent"] if active else C["subtext"],
                     bg=C["card"] if active else C["sidebar"])


class PillButton(tk.Label):
    """A rounded-looking flat button (rectangle w/ padding reads as a pill)."""

    def __init__(self, master, text, command, bg, fg, hover_bg=None, hover_fg=None, **kwargs):
        self.bg_normal = bg
        self.bg_hover = hover_bg or bg
        self.fg_normal = fg
        self.fg_hover = hover_fg or fg
        super().__init__(
            master, text=text, bg=bg, fg=fg, font=("Segoe UI", 10, "bold"),
            padx=16, pady=8, cursor="hand2", **kwargs,
        )
        self.command = command
        self.enabled = True
        self.bind("<Button-1>", lambda e: self._click())
        self.bind("<Enter>", lambda e: self.config(bg=self.bg_hover, fg=self.fg_hover) if self.enabled else None)
        self.bind("<Leave>", lambda e: self.config(bg=self.bg_normal, fg=self.fg_normal) if self.enabled else None)

    def _click(self):
        if self.enabled and self.command:
            self.command()

    def set_enabled(self, enabled: bool):
        self.enabled = enabled
        if enabled:
            self.config(bg=self.bg_normal, fg=self.fg_normal, cursor="hand2")
        else:
            self.config(bg=C["card_alt"], fg=C["subtext"], cursor="arrow")


class Card(tk.Frame):
    def __init__(self, master, title=None, **kwargs):
        super().__init__(master, bg=C["card"], highlightbackground=C["border"],
                          highlightthickness=1, bd=0, **kwargs)
        if title:
            tk.Label(self, text=title, bg=C["card"], fg=C["text"],
                      font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=16, pady=(14, 6))


class App:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.theme_name = self._load_theme()
        C.clear()
        C.update(THEMES.get(self.theme_name, THEMES["dark"]))

        root.title(APP_NAME)
        root.geometry("760x600")
        root.minsize(640, 480)
        root.configure(bg=C["bg"])

        try:
            root.iconbitmap(str(ICON_ICO))
        except Exception:
            pass

        self.games = self._load_games()
        self.log_queue: Queue = Queue()
        self.worker: WatchdogWorker | None = None
        self.current_view = "home"
        self._current_status = "stopped"
        self.watching_place_id = None

        strip_native_titlebar(root)
        self._configure_ttk()
        self._build_layout()
        self._refresh_game_list()
        self.root.after(200, self._poll_log_queue)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # ---------- ttk styling (for Entry/Scrollbar which need ttk to look decent) ----------
    def _configure_ttk(self):
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure("Dark.TEntry", fieldbackground=C["card_alt"], foreground=C["text"],
                         bordercolor=C["border"], insertcolor=C["text"], padding=6,
                         lightcolor=C["card_alt"], darkcolor=C["card_alt"])
        style.map("Dark.TEntry",
                   bordercolor=[("focus", C["accent"])],
                   lightcolor=[("focus", C["accent"])],
                   darkcolor=[("focus", C["accent"])])
        style.configure("Dark.Vertical.TScrollbar", background=C["card_alt"],
                         troughcolor=C["card"], bordercolor=C["card"], arrowcolor=C["subtext"])

    # ---------- persistence ----------
    def _load_theme(self) -> str:
        if SETTINGS_FILE.exists():
            try:
                data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
                name = data.get("theme", "dark")
                if name in THEMES:
                    return name
            except (json.JSONDecodeError, OSError):
                pass
        return "dark"

    def _save_theme(self):
        try:
            SETTINGS_FILE.write_text(json.dumps({"theme": self.theme_name}, indent=2),
                                      encoding="utf-8")
        except OSError:
            pass

    def _apply_theme(self, name: str):
        if name == self.theme_name:
            return
        self.theme_name = name
        C.clear()
        C.update(THEMES[name])
        self._save_theme()

        # Rebuild the whole UI with the new palette rather than trying to
        # recolor every existing widget individually.
        for widget in self.root.winfo_children():
            widget.destroy()
        self.root.configure(bg=C["bg"])
        self._configure_ttk()
        self._build_layout()
        self._refresh_game_list()
        self._set_status(self._current_status)  # restore running/idle visual state
        self._show_view("settings")

    def _load_games(self):
        if CONFIG_FILE.exists():
            try:
                return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return list(DEFAULT_GAMES)

    def _save_games(self):
        try:
            CONFIG_FILE.write_text(json.dumps(self.games, indent=2), encoding="utf-8")
        except OSError as e:
            messagebox.showerror("Save failed", f"Could not save games list:\\n{e}")

    # ---------- layout ----------
    def _build_layout(self):
        try:
            self._titlebar_icon = tk.PhotoImage(file=str(ICON_TITLEBAR))
        except Exception:
            self._titlebar_icon = None

        titlebar = TitleBar(self.root, APP_NAME, self._on_close, self._titlebar_icon)
        titlebar.pack(side="top", fill="x")

        body = tk.Frame(self.root, bg=C["bg"])
        body.pack(side="top", fill="both", expand=True)

        sidebar = tk.Frame(body, bg=C["sidebar"], width=64)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)

        if self._titlebar_icon is not None:
            tk.Label(sidebar, image=self._titlebar_icon, bg=C["sidebar"]).pack(pady=(18, 20))
        else:
            tk.Label(sidebar, text="🎮", font=("Segoe UI Emoji", 20), bg=C["sidebar"],
                      fg=C["accent"]).pack(pady=(18, 20))

        self.nav_home = SidebarButton(sidebar, "🏠", "Home", lambda: self._show_view("home"))
        self.nav_home.pack(pady=6)
        self.nav_log = SidebarButton(sidebar, "📜", "Log", lambda: self._show_view("log"))
        self.nav_log.pack(pady=6)
        self.nav_about = SidebarButton(sidebar, "ℹ️", "About", lambda: self._show_view("about"))
        self.nav_about.pack(pady=6)
        self.nav_settings = SidebarButton(sidebar, "⚙️", "Settings", lambda: self._show_view("settings"))
        self.nav_settings.pack(pady=6)
        self.nav_home.set_active(True)

        tk.Label(sidebar, text=APP_VERSION, bg=C["sidebar"], fg=C["subtext"],
                  font=("Segoe UI", 7)).pack(side="bottom", pady=10)

        main = tk.Frame(body, bg=C["bg"])
        main.pack(side="left", fill="both", expand=True)

        topbar = tk.Frame(main, bg=C["bg"])
        topbar.pack(fill="x", padx=24, pady=(20, 10))
        tk.Label(topbar, text=APP_NAME, bg=C["bg"], fg=C["text"],
                  font=("Segoe UI", 18, "bold")).pack(side="left")

        self.status_chip = tk.Label(topbar, text="●  Idle", bg=C["card_alt"], fg=C["subtext"],
                                     font=("Segoe UI", 9, "bold"), padx=12, pady=6)
        self.status_chip.pack(side="right")

        self.stop_btn = PillButton(topbar, "■  Stop", self._stop_watchdog,
                                    bg=C["card_alt"], fg=C["danger"],
                                    hover_bg=C["danger"], hover_fg="#ffffff")
        self.stop_btn.pack(side="right", padx=(0, 10))
        self.stop_btn.set_enabled(False)

        self.start_btn = PillButton(topbar, "▶  Start Watchdog", self._start_watchdog,
                                     bg=C["accent"], fg="#ffffff", hover_bg=C["accent_hover"])
        self.start_btn.pack(side="right", padx=(0, 10))

        tk.Label(main, text="Auto-relaunches Roblox into your game if it closes or crashes.",
                  bg=C["bg"], fg=C["subtext"], font=("Segoe UI", 10)).pack(
            anchor="w", padx=24, pady=(0, 16))

        self.content = tk.Frame(main, bg=C["bg"])
        self.content.pack(fill="both", expand=True, padx=24, pady=(0, 24))

        self.home_view = self._build_home_view(self.content)
        self.log_view = self._build_log_view(self.content)
        self.about_view = self._build_about_view(self.content)
        self.settings_view = self._build_settings_view(self.content)
        self._show_view("home")

    def _build_home_view(self, parent):
        view = tk.Frame(parent, bg=C["bg"])

        games_card = Card(view, title="Saved Games")
        games_card.pack(fill="x", pady=(0, 16))

        list_row = tk.Frame(games_card, bg=C["card"])
        list_row.pack(fill="x", padx=16, pady=(0, 10))

        self.game_listbox = tk.Listbox(
            list_row, height=5, exportselection=False,
            bg=C["card_alt"], fg=C["text"], selectbackground=C["accent"],
            selectforeground="#ffffff", relief="flat", bd=0,
            highlightthickness=1, highlightbackground=C["border"],
            font=("Segoe UI", 10), activestyle="none",
        )
        self.game_listbox.pack(side="left", fill="x", expand=True, ipady=4)
        self.game_listbox.bind("<<ListboxSelect>>", lambda e: self._update_selected_status())
        scrollbar = ttk.Scrollbar(list_row, orient="vertical", command=self.game_listbox.yview,
                                   style="Dark.Vertical.TScrollbar")
        scrollbar.pack(side="right", fill="y")
        self.game_listbox.config(yscrollcommand=scrollbar.set)

        btn_row = tk.Frame(games_card, bg=C["card"])
        btn_row.pack(fill="x", padx=16, pady=(0, 16))
        PillButton(btn_row, "+ Add Game", self._add_game, bg=C["card_alt"], fg=C["text"],
                    hover_bg=C["border"]).pack(side="left")
        PillButton(btn_row, "Remove Selected", self._remove_game, bg=C["card_alt"], fg=C["danger"],
                    hover_bg=C["danger"], hover_fg="#ffffff").pack(side="left", padx=(8, 0))

        status_card = Card(view, title="Selected Game")
        status_card.pack(fill="x", pady=(0, 16))
        status_inner = tk.Frame(status_card, bg=C["card"])
        status_inner.pack(fill="x", padx=16, pady=(0, 16))

        left_col = tk.Frame(status_inner, bg=C["card"])
        left_col.pack(side="left", fill="x", expand=True)
        self.selected_name_label = tk.Label(left_col, text="—", bg=C["card"], fg=C["text"],
                                             font=("Segoe UI", 12, "bold"), anchor="w")
        self.selected_name_label.pack(fill="x", anchor="w")
        self.selected_id_label = tk.Label(left_col, text="", bg=C["card"], fg=C["subtext"],
                                           font=("Segoe UI", 9), anchor="w")
        self.selected_id_label.pack(fill="x", anchor="w")

        self.selected_status_chip = tk.Label(status_inner, text="Not watching", bg=C["card_alt"],
                                              fg=C["subtext"], font=("Segoe UI", 9, "bold"),
                                              padx=10, pady=5)
        self.selected_status_chip.pack(side="right")

        return view

    def _build_about_view(self, parent):
        view = tk.Frame(parent, bg=C["bg"])
        card = Card(view)
        card.pack(fill="both", expand=True)

        inner = tk.Frame(card, bg=C["card"])
        inner.pack(fill="both", expand=True, padx=24, pady=24)

        if self._titlebar_icon is not None:
            try:
                big_icon = tk.PhotoImage(file=str(resource_path("RoRejoinX_32.png")))
                self._about_icon_ref = big_icon
                tk.Label(inner, image=big_icon, bg=C["card"]).pack(pady=(10, 12))
            except Exception:
                pass

        tk.Label(inner, text=APP_NAME, bg=C["card"], fg=C["text"],
                  font=("Segoe UI", 16, "bold")).pack()
        tk.Label(inner, text=APP_VERSION, bg=C["card"], fg=C["subtext"],
                  font=("Segoe UI", 10)).pack(pady=(2, 18))

        tk.Label(inner, text="Auto-relaunches Roblox into your saved game if it crashes.",
                  bg=C["card"], fg=C["subtext"], font=("Segoe UI", 9)).pack(pady=(0, 18))

        divider = tk.Frame(inner, bg=C["border"], height=1)
        divider.pack(fill="x", padx=40, pady=(0, 18))

        tk.Label(inner, text="CREDITS", bg=C["card"], fg=C["subtext"],
                  font=("Segoe UI", 8, "bold")).pack()
        tk.Label(inner, text=CREDITS, bg=C["card"], fg=C["accent"],
                  font=("Segoe UI", 13, "bold")).pack(pady=(4, 0))

        divider2 = tk.Frame(inner, bg=C["border"], height=1)
        divider2.pack(fill="x", padx=40, pady=(18, 14))

        tk.Label(inner, text="DATA SAVED TO", bg=C["card"], fg=C["subtext"],
                  font=("Segoe UI", 8, "bold")).pack()
        tk.Label(inner, text=str(app_dir()), bg=C["card"], fg=C["subtext"],
                  font=("Segoe UI", 8)).pack(pady=(4, 0))

        return view

    def _build_settings_view(self, parent):
        view = tk.Frame(parent, bg=C["bg"])
        card = Card(view, title="Appearance")
        card.pack(fill="x")

        inner = tk.Frame(card, bg=C["card"])
        inner.pack(fill="x", padx=16, pady=(0, 16))

        tk.Label(inner, text="THEME", bg=C["card"], fg=C["subtext"],
                  font=("Segoe UI", 8, "bold")).pack(anchor="w", pady=(0, 8))

        btn_row = tk.Frame(inner, bg=C["card"])
        btn_row.pack(anchor="w")

        def theme_colors(name):
            active = self.theme_name == name
            return (C["accent"], "#ffffff") if active else (C["card_alt"], C["text"])

        dark_bg, dark_fg = theme_colors("dark")
        light_bg, light_fg = theme_colors("light")

        PillButton(btn_row, "🌙  Dark", lambda: self._apply_theme("dark"),
                    bg=dark_bg, fg=dark_fg, hover_bg=C["accent_hover"],
                    hover_fg="#ffffff").pack(side="left")
        PillButton(btn_row, "☀️  Light", lambda: self._apply_theme("light"),
                    bg=light_bg, fg=light_fg, hover_bg=C["accent_hover"],
                    hover_fg="#ffffff").pack(side="left", padx=(8, 0))

        return view

    def _build_log_view(self, parent):
        view = tk.Frame(parent, bg=C["bg"])
        card = Card(view, title="Live Log")
        card.pack(fill="both", expand=True)

        text_frame = tk.Frame(card, bg=C["card"])
        text_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        self.log_text = tk.Text(
            text_frame, bg=C["card_alt"], fg=C["text"], insertbackground=C["text"],
            relief="flat", bd=0, font=("Consolas", 9), wrap="word", state="disabled",
            highlightthickness=1, highlightbackground=C["border"],
        )
        self.log_text.pack(side="left", fill="both", expand=True)
        log_scroll = ttk.Scrollbar(text_frame, orient="vertical", command=self.log_text.yview,
                                    style="Dark.Vertical.TScrollbar")
        log_scroll.pack(side="right", fill="y")
        self.log_text.config(yscrollcommand=log_scroll.set)

        return view

    def _show_view(self, name):
        self.current_view = name
        self.home_view.pack_forget()
        self.log_view.pack_forget()
        self.about_view.pack_forget()
        self.settings_view.pack_forget()
        if name == "home":
            self.home_view.pack(fill="both", expand=True)
        elif name == "log":
            self.log_view.pack(fill="both", expand=True)
        elif name == "settings":
            self.settings_view.pack(fill="both", expand=True)
        else:
            self.about_view.pack(fill="both", expand=True)
        self.nav_home.set_active(name == "home")
        self.nav_log.set_active(name == "log")
        self.nav_about.set_active(name == "about")
        self.nav_settings.set_active(name == "settings")

    def _refresh_game_list(self):
        self.game_listbox.delete(0, tk.END)
        for g in self.games:
            self.game_listbox.insert(tk.END, f"  {g['name']}   ·   Place ID {g['place_id']}")
        if self.games:
            self.game_listbox.selection_set(0)
        self._update_selected_status()

    def _update_selected_status(self):
        sel = self.game_listbox.curselection()
        if not sel or not self.games:
            self.selected_name_label.config(text="—")
            self.selected_id_label.config(text="No game selected")
            self.selected_status_chip.config(text="Not watching", bg=C["card_alt"], fg=C["subtext"])
            return

        game = self.games[sel[0]]
        self.selected_name_label.config(text=game["name"])
        self.selected_id_label.config(text=f"Place ID {game['place_id']}")

        if self.watching_place_id == game["place_id"]:
            self.selected_status_chip.config(text="●  Watching", bg=C["success"], fg="#0e0e16")
        else:
            self.selected_status_chip.config(text="Not watching", bg=C["card_alt"], fg=C["subtext"])

    # ---------- game management ----------
    def _add_game(self):
        dialog = tk.Toplevel(self.root)
        dialog.overrideredirect(True)
        dialog.configure(bg=C["card"])
        dialog.transient(self.root)

        dialog_w, dialog_h = 420, 300
        rx, ry = self.root.winfo_x(), self.root.winfo_y()
        rw, rh = self.root.winfo_width(), self.root.winfo_height()
        x = rx + (rw - dialog_w) // 2
        y = ry + (rh - dialog_h) // 2
        dialog.geometry(f"{dialog_w}x{dialog_h}+{x}+{y}")

        TitleBar(dialog, "Add Game", dialog.destroy, self._titlebar_icon,
                  show_minimize=False, target=dialog).pack(side="top", fill="x")

        body = tk.Frame(dialog, bg=C["card"])
        body.pack(fill="both", expand=True)
        pad = {"padx": 24}

        tk.Label(body, text="NAME", bg=C["card"], fg=C["subtext"],
                  font=("Segoe UI", 8, "bold")).pack(anchor="w", pady=(22, 4), **pad)
        name_entry = ttk.Entry(body, style="Dark.TEntry", font=("Segoe UI", 10))
        name_entry.pack(fill="x", ipady=4, **pad)

        tk.Label(body, text="ROBLOX GAME LINK OR PLACE ID", bg=C["card"], fg=C["subtext"],
                  font=("Segoe UI", 8, "bold")).pack(anchor="w", pady=(18, 4), **pad)
        id_entry = ttk.Entry(body, style="Dark.TEntry", font=("Segoe UI", 10))
        id_entry.pack(fill="x", ipady=4, **pad)

        status_label = tk.Label(body, text="Paste a link or Place ID to auto-fill the name",
                                 bg=C["card"], fg=C["subtext"], font=("Segoe UI", 8))
        status_label.pack(anchor="w", pady=(6, 0), **pad)

        fetch_queue: Queue = Queue()
        name_auto_filled = {"value": False}

        def poll_fetch():
            try:
                while True:
                    result = fetch_queue.get_nowait()
                    if result:
                        # Only overwrite if the user hasn't typed their own name
                        if not name_entry.get().strip() or name_auto_filled["value"]:
                            name_entry.delete(0, tk.END)
                            name_entry.insert(0, result)
                            name_auto_filled["value"] = True
                        status_label.config(text="✓ Name auto-filled", fg=C["success"])
                        if save_pending["active"]:
                            save_pending["active"] = False
                            perform_save()
                    else:
                        status_label.config(
                            text="Couldn't auto-fetch the name — type one in manually",
                            fg=C["subtext"],
                        )
                        save_pending["active"] = False
            except Empty:
                pass
            if dialog.winfo_exists():
                dialog.after(150, poll_fetch)

        poll_fetch()

        def trigger_fetch(event=None):
            place_id = extract_place_id(id_entry.get())
            if not place_id:
                return
            status_label.config(text="Fetching game name...", fg=C["subtext"])
            threading.Thread(
                target=lambda: fetch_queue.put(fetch_roblox_game_name(place_id)),
                daemon=True,
            ).start()

        id_entry.bind("<FocusOut>", trigger_fetch)
        id_entry.bind("<Return>", trigger_fetch)
        # If the user edits the name field themselves, stop auto-overwriting it
        name_entry.bind("<Key>", lambda e: name_auto_filled.__setitem__("value", False))

        save_pending = {"active": False}

        def perform_save():
            name = name_entry.get().strip()
            place_id = extract_place_id(id_entry.get())
            if not place_id:
                messagebox.showerror(
                    "Invalid link/ID",
                    "Couldn't find a Place ID. Paste either the full roblox.com/games/... "
                    "link or just the numeric Place ID.",
                    parent=dialog,
                )
                return
            if not name:
                # Try fetching the name automatically before giving up and
                # asking the user to type one in themselves.
                save_pending["active"] = True
                status_label.config(text="Fetching game name before saving...", fg=C["subtext"])
                threading.Thread(
                    target=lambda: fetch_queue.put(fetch_roblox_game_name(place_id)),
                    daemon=True,
                ).start()
                return
            self.games.append({"name": name, "place_id": place_id})
            self._save_games()
            self._refresh_game_list()
            dialog.destroy()

        btn_row = tk.Frame(body, bg=C["card"])
        btn_row.pack(pady=(22, 0), **pad)
        PillButton(btn_row, "Save", perform_save, bg=C["accent"], fg="#ffffff",
                    hover_bg=C["accent_hover"]).pack(side="left")
        PillButton(btn_row, "Cancel", dialog.destroy, bg=C["card_alt"], fg=C["text"],
                    hover_bg=C["border"]).pack(side="left", padx=(8, 0))

        name_entry.focus_set()
        dialog.update_idletasks()
        dialog.deiconify()
        dialog.lift()
        dialog.focus_force()

    def _remove_game(self):
        sel = self.game_listbox.curselection()
        if not sel:
            return
        idx = sel[0]
        removed = self.games.pop(idx)
        self._save_games()
        self._refresh_game_list()
        self._append_log(f"Removed '{removed['name']}' from saved games.")

    # ---------- watchdog control ----------
    def _start_watchdog(self):
        sel = self.game_listbox.curselection()
        if not sel:
            messagebox.showwarning("No game selected", "Pick a game from the list first.")
            return
        game = self.games[sel[0]]

        self.worker = WatchdogWorker(game["place_id"], game["name"], self.log_queue, self._set_status)
        self.worker.start()
        self.watching_place_id = game["place_id"]
        self.start_btn.set_enabled(False)
        self.stop_btn.set_enabled(True)
        self.game_listbox.config(state="disabled")
        self._update_selected_status()

    def _stop_watchdog(self):
        if self.worker:
            self.worker.stop()
        self.stop_btn.set_enabled(False)

    def _set_status(self, state: str):
        self._current_status = state

        def update():
            if state == "running":
                self.status_chip.config(text="●  Watching", bg=C["success"], fg="#0e0e16")
                self.start_btn.set_enabled(False)
                self.stop_btn.set_enabled(True)
                self.game_listbox.config(state="disabled")
            else:
                self.status_chip.config(text="●  Idle", bg=C["card_alt"], fg=C["subtext"])
                self.start_btn.set_enabled(True)
                self.stop_btn.set_enabled(False)
                self.game_listbox.config(state="normal")
                self.watching_place_id = None
            self._update_selected_status()
        self.root.after(0, update)

    # ---------- logging ----------
    def _append_log(self, line: str):
        self.log_text.configure(state="normal")
        self.log_text.insert(tk.END, line + "\\n")
        self.log_text.see(tk.END)
        self.log_text.configure(state="disabled")

    def _poll_log_queue(self):
        try:
            while True:
                line = self.log_queue.get_nowait()
                self._append_log(line)
        except Empty:
            pass
        self.root.after(200, self._poll_log_queue)

    def _on_close(self):
        if self.worker:
            self.worker.stop()
            time.sleep(0.2)
        self._save_games()
        self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()
`;
const HERO_B64 = "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";
const SMALL_B64 = "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";
const ICO_B64 = "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";

const LOG_LINES = [
  "[03:21:27] === Watchdog started for 'Anime Expeditions' ===",
  "[03:21:27] Watching for 'RobloxPlayerBeta.exe'.",
  "[03:21:35] Roblox process exited.",
  "[03:21:39] Launching Roblox into Anime Expeditions (Place ID 84515722934860)...",
  "[03:21:43] Roblox relaunched (PID 48512). Resuming watch.",
];

const EXE_URL = "https://github.com/R-7wX/RoRejoinX/releases/download/1.0.1/RoRejoinX.exe";

function downloadExe() {
  const a = document.createElement("a");
  a.href = EXE_URL;
  a.download = "RoRejoinX.exe";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadDataUri(filename, base64, mime) {
  const a = document.createElement("a");
  a.href = `data:${mime};base64,${base64}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function TerminalBlock() {
  const [ref, inView] = useInView(0.4);
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (visibleLines >= LOG_LINES.length) return;
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 420);
    return () => clearTimeout(t);
  }, [inView, visibleLines]);

  const lineColor = (line) => {
    if (line.includes("exited")) return "#ff5c6c";
    if (line.includes("relaunched") || line.includes("Resuming")) return "#3ddc84";
    if (line.includes("Launching")) return "#7c9bff";
    return "#8f8fa8";
  };

  return (
    <div ref={ref} className="rounded-xl border overflow-hidden"
      style={{ borderColor: "#262638", background: "#0e0e17" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "#262638", background: "#14141f" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5c6c" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#f2c94c" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3ddc84" }} />
        <span className="ml-3 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#6b6b80" }}>
          rorejoinx_log.txt
        </span>
      </div>
      <div className="p-5 min-h-[168px]" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12.5px", lineHeight: "1.9" }}>
        {LOG_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{ color: lineColor(line) }}>
            {line}
            {i === visibleLines - 1 && (
              <span className="inline-block w-[7px] h-[13px] ml-1 align-middle" style={{ background: "#7c5cff", animation: "blink 1s step-end infinite" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PulseMonitor() {
  // One long path: steady rhythm -> flatline (crash) -> sharp spike (relaunch) -> steady again.
  const segment =
    "M0,40 L40,40 L52,40 L60,14 L68,60 L76,40 L120,40 " +
    "L160,40 L172,40 L180,14 L188,60 L196,40 L240,40 " +
    "L280,40 L340,40 L400,40 " + // flatline = crash
    "L410,40 L420,4 L430,40 " + // spike = relaunch
    "L470,40 L482,40 L490,14 L498,60 L506,40 L560,40";

  return (
    <div className="relative w-full overflow-hidden rounded-xl border"
      style={{ borderColor: "#262638", background: "#0e0e17", height: "120px" }}>
      <div className="absolute inset-0 flex items-center" style={{ animation: "scrollLeft 9s linear infinite" }}>
        <svg width="1120" height="120" viewBox="0 0 1120 120" style={{ display: "block" }}>
          <defs>
            <linearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c5cff" />
              <stop offset="55%" stopColor="#3ddce0" />
              <stop offset="70%" stopColor="#ff5c6c" />
              <stop offset="82%" stopColor="#3ddc84" />
              <stop offset="100%" stopColor="#7c5cff" />
            </linearGradient>
          </defs>
          <path d={segment} fill="none" stroke="url(#pulseGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,20)" />
          <path d={segment} fill="none" stroke="url(#pulseGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(560,20)" />
        </svg>
      </div>
      <div className="absolute left-4 top-3 text-[10px] tracking-widest uppercase" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#6b6b80" }}>
        live status
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Shield, title: "Auto crash recovery", body: "Detects the moment Roblox closes unexpectedly and relaunches it straight back into your game." },
  { icon: ListChecks, title: "Saved games list", body: "Keep a shortlist of games with names and Place IDs, and pick which one to watch." },
  { icon: Search, title: "Auto-fetch names", body: "Paste a link or Place ID and it pulls the real game title from Roblox for you." },
  { icon: SunMoon, title: "Dark & light themes", body: "Switch the whole interface instantly from the Settings page. Your choice is remembered." },
  { icon: Terminal, title: "Live log", body: "Every launch, crash, and relaunch is timestamped and shown right in the app." },
  { icon: Info, title: "Always know what's watched", body: "The Selected Game panel shows exactly which game is currently being monitored." },
];

const STEPS = [
  { n: "01", title: "Pick a game", body: "Add a game by pasting its link or Place ID, or use the one already saved." },
  { n: "02", title: "Start the watchdog", body: "Click Start. RoRejoinX begins watching for Roblox in the background." },
  { n: "03", title: "Roblox crashes", body: "The moment the process disappears unexpectedly, it's logged instantly." },
  { n: "04", title: "Back in, automatically", body: "RoRejoinX relaunches Roblox straight into the same game. No alt-tabbing required." },
];

export default function RoRejoinXSite() {

  return (
    <div style={{ background: "#0a0a12", color: "#f2f2f7", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes scrollLeft { from { transform: translateX(0); } to { transform: translateX(-560px); } }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes floatUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: floatUp 0.6s ease both; }
        ::selection { background: #7c5cff; color: white; }
      `}</style>

      {/* Nav */}
      <nav className="sticky top-0 z-20 backdrop-blur border-b" style={{ borderColor: "#1c1c2a", background: "rgba(10,10,18,0.75)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={`data:image/png;base64,${SMALL_B64}`} alt="" className="w-6 h-6" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "16px" }}>RoRejoinX</span>
          </div>
          <button
            onClick={downloadExe}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: "#7c5cff", color: "#fff" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#8f72ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#7c5cff")}
          >
            <Download size={15} /> Download
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="fade-in">
          <div className="inline-block text-[11px] tracking-[0.2em] uppercase px-3 py-1 rounded-full border mb-6"
            style={{ borderColor: "#2a2a3d", color: "#8f8fa8", fontFamily: "'JetBrains Mono', monospace" }}>
            Roblox Crash Watchdog
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.4rem, 5vw, 3.6rem)", lineHeight: 1.05, fontWeight: 700 }}>
            Never lose your spot
            <br />
            when{" "}
            <span style={{
              background: "linear-gradient(90deg, #7c5cff, #3ddce0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Roblox crashes
            </span>.
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed max-w-md" style={{ color: "#a8a8ba" }}>
            RoRejoinX watches Roblox in the background. The second it closes unexpectedly,
            it relaunches straight back into your saved game — automatically.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={downloadExe}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-[1.02]"
              style={{ background: "#7c5cff", color: "#fff" }}
            >
              <Download size={16} /> Download RoRejoinX
            </button>
            <a href="#how" className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm border"
              style={{ borderColor: "#2a2a3d", color: "#f2f2f7" }}>
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs" style={{ color: "#6b6b80" }}>
            Windows · Standalone .exe · v1.0.0
          </p>
        </div>

        <div className="fade-in relative flex items-center justify-center" style={{ animationDelay: "0.15s" }}>
          <div className="absolute w-72 h-72 rounded-full blur-3xl opacity-20"
            style={{ background: "radial-gradient(circle, #7c5cff, transparent 70%)" }} />
          <img src={`data:image/png;base64,${HERO_B64}`} alt="RoRejoinX logo" className="relative w-52 h-52 md:w-64 md:h-64" />
        </div>
      </section>

      {/* Pulse monitor */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <PulseMonitor />
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 600 }}>
          What it does
        </h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="rounded-xl border p-5" style={{ borderColor: "#1e1e2c", background: "#12121c" }}>
              <f.icon size={18} style={{ color: "#7c5cff" }} />
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "#8f8fa8" }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-6 pb-20">
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.6rem", fontWeight: 600 }}>
          How it works
        </h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {STEPS.map((s, i) => (
              <div key={i} className="flex gap-4">
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#7c5cff", fontSize: "13px" }}>{s.n}</span>
                <div>
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "#8f8fa8" }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <TerminalBlock />
        </div>
      </section>

      {/* Download / build */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border p-8" style={{ borderColor: "#262638", background: "#12121c" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.5rem", fontWeight: 600 }}>
            Get RoRejoinX
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#8f8fa8" }}>
            Download the standalone Windows .exe — no Python install required.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={downloadExe}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm"
              style={{ background: "#7c5cff", color: "#fff" }}
            >
              <Download size={16} /> RoRejoinX.exe
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "#1c1c2a" }}>
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "#6b6b80" }}>
          <div className="flex items-center gap-2">
            <img src={`data:image/png;base64,${SMALL_B64}`} alt="" className="w-4 h-4" />
            RoRejoinX v1.0.0
          </div>
          <div>Credits: AXTS</div>
        </div>
      </footer>
    </div>
  );
}
