import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Download, ExternalLink } from "lucide-react";

const REPO = "R-7wX/RoRejoinX";
const GITHUB_API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;
const GITHUB_RELEASES_PAGE = `https://github.com/${REPO}/releases`;

function useLatestRelease() {
  const [state, setState] = useState({ loading: true, version: null, exeUrl: null, releaseUrl: GITHUB_RELEASES_PAGE, body: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch(GITHUB_API_LATEST, { headers: { Accept: "application/vnd.github+json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const version = (data.tag_name || "").replace(/^v/i, "");
        const exeAsset = (data.assets || []).find((a) => a.name?.toLowerCase().endsWith(".exe"));
        setState({
          loading: false,
          version: version || null,
          zipUrl: exeAsset ? exeAsset.browser_download_url : null,
          releaseUrl: data.html_url || GITHUB_RELEASES_PAGE,
          body: data.body || "*No release notes provided.*",
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}

export default function App() {
  const release = useLatestRelease();
  const versionLabel = release.loading ? "..." : release.version ? `v${release.version}` : "v1.1.0";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-green-400 selection:text-black">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-5xl mx-auto border-b border-neutral-900">
        <div className="font-bold tracking-tight text-xl">RoRejoinX</div>
        <a href={release.releaseUrl} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 hover:text-white transition-colors">
          GitHub
        </a>
      </nav>

      <main className="max-w-3xl mx-auto px-8 pt-32 pb-24">
        {/* Hero */}
        <section className="mb-24 fade-in">
          <div className="inline-block px-3 py-1 mb-6 text-xs font-medium tracking-widest text-green-400 uppercase border border-green-400/20 rounded-full bg-green-400/10">
            Roblox Crash Watchdog
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white">
            Never lose your spot<br />when Roblox crashes.
          </h1>
          <p className="text-lg text-neutral-400 max-w-xl mb-10 leading-relaxed">
            RoRejoinX silently watches your game in the background. The instant Roblox closes unexpectedly, you are automatically launched right back in. No alt-tabbing, no menus.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a 
              href={release.exeUrl || release.releaseUrl}
              className="flex items-center gap-2 px-6 py-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <Download size={18} /> 
              Download {versionLabel}
            </a>
            <a 
              href={release.releaseUrl}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-6 py-4 text-neutral-300 font-medium rounded-lg hover:bg-neutral-900 transition-colors"
            >
              <ExternalLink size={18} />
              View Source
            </a>
          </div>
          <p className="mt-4 text-xs text-neutral-600 font-mono">
            Windows 10/11 • Custom Setup Wizard
          </p>
        </section>

        {/* Dynamic Changelog */}
        <section className="border border-neutral-800 rounded-2xl p-8 sm:p-12 bg-neutral-950 fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-8 border-b border-neutral-800 pb-6">
            <h2 className="text-xl font-bold">Latest Release Notes</h2>
            <span className="font-mono text-sm text-green-400 px-3 py-1 bg-green-400/10 rounded-full">
              {versionLabel}
            </span>
          </div>
          
          <div className="prose prose-invert prose-neutral max-w-none prose-a:text-green-400 hover:prose-a:text-green-300">
            {release.loading ? (
              <p className="text-neutral-500 animate-pulse">Fetching changelog from GitHub...</p>
            ) : release.error ? (
              <p className="text-red-400">Failed to load release notes. View them directly on GitHub.</p>
            ) : (
              <ReactMarkdown>{release.body}</ReactMarkdown>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-sm text-neutral-600 font-mono">
        RoRejoinX {versionLabel} • Created by AXTS
      </footer>
    </div>
  );
}
