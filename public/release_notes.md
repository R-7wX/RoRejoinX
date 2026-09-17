# 🚀 RoRejoinX v1.1.4: Full Remote Control & Modal System Overhaul!

We are thrilled to announce **v1.1.4**! This release introduces a comprehensive **Full-Access Remote Control Web Dashboard** allowing complete app and session management from any browser or mobile device on your local network, alongside critical stability fixes to the modal dialog engine.

## 📱 Full-Access Remote Control Web Dashboard
* **Network-Wide Management**: Access RoRejoinX from your smartphone, tablet, or secondary PC via a modern, responsive web portal.
* **Live System Monitoring**: Track real-time memory usage, session uptime, active accounts, and live log feeds without opening the desktop GUI.
* **Instant Session Controls**: Start, stop, or force-relaunch Roblox instances remotely. Switch active target games across accounts on the fly with automatic syncing.

## 🪟 Modal Dialog & Interface Reliability
* **Cancel & ✕ Button Teardown**: Fixed a critical recursive teardown issue that previously prevented the Cancel button and top-right close (✕) button from closing modal dialogs.
* **Clean Window Protocol Support**: Added full `WM_DELETE_WINDOW` protocol binding to ensure Alt+F4 or system window events properly clean up glass backdrops and release input focus.
* **Input Color Theme Safety**: Resolved missing theme variables when opening text entry dialogs (Add/Edit Game, Add Account) to prevent any unexpected interface crashes.

## 🔄 Standalone Updater v1.0.2
* **Seamless Extraction**: Enhanced self-updating launcher reliability and version detection when updating to v1.1.4.

---

# 🚀 RoRejoinX v1.1.1: The Powerhouse Update!

We are incredibly excited to announce the massive v1.1.1 update. We've completely redesigned the UI to an ultra-modern standard and added four powerhouse features that turn RoRejoinX into the ultimate Roblox utility suite.

## 🔄 Auto-Updating Launcher
* **Persistent Launcher:** The standalone Setup Wizard has been completely re-architected into a persistent, Auto-Updating Launcher that seamlessly installs updates and launches the app in one click.
* **Sleek Launcher UI:** The Auto-Updating Launcher has been redesigned with a borderless glassmorphic loading screen, perfectly centered on your desktop and featuring the official app icon.

## 🎨 Ultra-Modern UI Overhaul
* **Custom Borderless Window:** We stripped away the clunky Windows borders and built a sleek, custom dragable title bar with hover-animated close/minimize buttons.
* **Premium Graphical Icons:** Say goodbye to ugly text-emojis! The sidebar now features beautiful, high-definition icons for Home, Accounts, Logs, Stats, and Settings.
* **Dual-Color Theme Presets:** Customize your interface with stunning split-color gradients and preset colorways.
