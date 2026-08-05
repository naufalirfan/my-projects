import argparse
import json
import sys
import time
import webbrowser
from pathlib import Path


def setup_wizard():
    print("\n=== AI Router Setup ===\n")
    from .config import load_config, save_config
    cfg = load_config()
    for pn, pc in cfg.get("providers", {}).items():
        if not pc.get("models"):
            continue
        print(f"[{pn}]")
        print(f"  Models: {', '.join(pc.get('models', [])[:4])}")
        cur = pc.get("api_key", "")
        if cur:
            print(f"  Current key: {cur[:8]}...")
        key = input("  API key (Enter skip): ").strip()
        if key:
            pc["api_key"] = key
            pc["enabled"] = True
            cfg["providers"][pn] = pc
        print()
    path = input("Save config to [config.yaml]: ").strip() or "config.yaml"
    save_config(cfg, path)
    print(f"Saved to {path}. Run: python -m ai_router")


def tui_dashboard():
    try:
        from rich.console import Console
        from rich.table import Table
        from rich.live import Live
        from rich.panel import Panel
        from rich.layout import Layout
        from rich.text import Text
    except ImportError:
        print("Install: pip install rich")
        sys.exit(1)

    from .config import load_config
    from .router_engine import RouterEngine
    from .quota import quota_tracker

    console = Console()
    cfg = load_config()
    router = RouterEngine(cfg)

    def make_display():
        st = router.get_provider_status()
        qt = quota_tracker.get_total_stats()
        layout = Layout()
        layout.split_column(Layout(name="header", size=3), Layout(name="body"), Layout(name="footer", size=3))
        header = Text(
            f"AI Router  |  {len(st)} providers  |  {len(router.get_all_models())} models  |  {qt.get('total_tokens', 0):,} tokens  |  {qt.get('total_requests', 0)} requests",
            style="bold cyan",
        )
        layout["header"].update(Panel(header))
        table = Table(title="Providers")
        table.add_column("Provider")
        table.add_column("Status")
        table.add_column("Tier")
        table.add_column("Latency")
        table.add_column("Keys")
        table.add_column("Tokens")
        table.add_column("Errors")
        qs = quota_tracker.get_all_summaries()
        for s in st:
            ic = "🟢" if s["enabled"] else "🔴"
            cd = "⏳" if s.get("cooldown") else ""
            qd = qs.get(s["name"], {})
            table.add_row(
                f"{ic} {s['name']}",
                f"{'Active' if s['enabled'] else 'Off'}{cd}",
                str(s["tier"]),
                f"{s.get('avg_latency_ms', 0)}ms",
                str(s["accounts"]),
                str(qd.get("total_tokens", 0)),
                str(qd.get("total_errors", 0)),
            )
        layout["body"].update(table)
        layout["footer"].update(Panel(Text("Press Ctrl+C to exit", style="dim")))
        return layout

    try:
        with Live(make_display(), refresh_per_second=2, screen=True) as live:
            while True:
                time.sleep(2)
                live.update(make_display())
    except KeyboardInterrupt:
        console.print("\nExited.")


def export_usage():
    from .quota import quota_tracker
    data = quota_tracker.get_all_summaries()
    path = f"airouter-usage-{int(time.time())}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Exported to {path}")

    total = quota_tracker.get_total_stats()
    print(f"Total tokens: {total.get('total_tokens', 0):,}")
    print(f"Total requests: {total.get('total_requests', 0):,}")

    by_prov = {}
    for k, v in data.items():
        p = v.get("provider", "?")
        by_prov.setdefault(p, {"tokens": 0, "reqs": 0})
        by_prov[p]["tokens"] += v.get("total_tokens", 0)
        by_prov[p]["reqs"] += v.get("total_requests", 0)
    for p, d in sorted(by_prov.items(), key=lambda x: -x[1]["tokens"]):
        print(f"  {p:15s}: {d['tokens']:>8,} tokens, {d['reqs']:>5} requests")


def main():
    parser = argparse.ArgumentParser(description="AI Router - Modular AI Gateway")
    parser.add_argument("--config", "-c", help="Path to config file", default=None)
    parser.add_argument("--host", help="Host to bind to", default=None)
    parser.add_argument("--port", "-p", help="Port to bind to", type=int, default=None)
    parser.add_argument("--minimal", action="store_true", help="Minimal mode (no dashboard)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser")
    parser.add_argument("--setup", action="store_true", help="Interactive setup wizard")
    parser.add_argument("--tui", action="store_true", help="Terminal UI dashboard")
    parser.add_argument("--discover", action="store_true", help="Discover models and exit")
    parser.add_argument("--list-providers", action="store_true", help="List providers and exit")
    parser.add_argument("--export-usage", action="store_true", help="Export usage data to JSON")
    parser.add_argument("--version", action="store_true", help="Show version")
    args = parser.parse_args()

    if args.version:
        print("AI Router v1.0.0")
        return
    if args.setup:
        setup_wizard()
        return
    if args.tui:
        tui_dashboard()
        return
    if args.export_usage:
        export_usage()
        return

    from .config import load_config
    cfg = load_config(args.config)

    if args.host:
        cfg["server"]["host"] = args.host
    if args.port:
        cfg["server"]["port"] = args.port

    if args.list_providers:
        print(f"{'Provider':20s} {'Status':10s} Tier Keys Models")
        print("-" * 60)
        for pn, pc in cfg.get("providers", {}).items():
            st = "enabled" if pc.get("enabled") else "disabled"
            keys = len(pc.get("api_keys", [])) + (1 if pc.get("api_key") else 0)
            oa = " oauth" if pc.get("oauth") else ""
            print(f"{pn:20s} {st:10s} T{pc.get('tier','?')}   {keys}    {len(pc.get('models', []))}{oa}")
        return

    if args.discover:
        from .router_engine import RouterEngine
        engine = RouterEngine(cfg)
        engine.discover_models()
        print(f"Models: {len(engine.get_all_models())}")
        for m in engine.get_all_models():
            print(f"  {m['id']}")
        return

    import uvicorn
    host, port = cfg["server"]["host"], cfg["server"]["port"]

    if not args.no_browser and not args.minimal and cfg["server"].get("dashboard", True):
        webbrowser.open(f"http://{host}:{port}/dashboard")

    # Override config for minimal mode
    if args.minimal:
        cfg["server"]["dashboard"] = False

    line = "=" * 50
    print(f"\n{line}")
    print(f"  AI Router {'(minimal)' if args.minimal else ''}")
    print(f"  Endpoint  : http://{host}:{port}/v1")
    print(f"  Dashboard : http://{host}:{port}/dashboard{' (disabled)' if args.minimal else ''}")
    print(f"  Providers : {sum(1 for p in cfg.get('providers', {}).values() if p.get('enabled'))} enabled")
    print(f"{line}\n")

    uvicorn.run(
        "ai_router.server:app",
        host=host,
        port=port,
        log_level=cfg.get("server", {}).get("log_level", "info").lower(),
    )


if __name__ == "__main__":
    main()
