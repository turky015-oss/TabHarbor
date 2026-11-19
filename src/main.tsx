import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  History,
  Star,
  ArrowDownUp,
  Settings2,
  ShieldCheck,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  RotateCcw,
  Pencil,
  Trash2,
  X,
  Search,
  Monitor,
  Layers,
  Check,
  Archive,
  Download,
  Upload,
  Clock3,
  Pin,
  LockKeyhole,
  ClipboardList,
  Zap,
  ChevronDown,
  LoaderCircle,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  Keyboard,
} from "lucide-react";
import { ClipboardPanel } from "./ClipboardPanel";
import { createRoot } from "react-dom/client";
import {
  defaults,
  safeUrl,
  type State,
  type Session,
  type Command,
  type Reply,
} from "./model";
import { translate, applyLocale, type Key } from "./i18n";
import "./style.css";
const popup = location.pathname.includes("popup");
function App() {
  const [state, setState] = useState<State>(defaults),
    [page, setPage] = useState(location.hash.slice(1) || "overview"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("date"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [openCount, setOpenCount] = useState(0),
    [modal, setModal] = useState<{
      kind: "save" | "rename" | "delete" | "details";
      session?: Session;
      scope?: "current" | "all";
    } | null>(null),
    [name, setName] = useState(""),
    [selected, setSelected] = useState<number[]>([]),
    [expanded, setExpanded] = useState<string | null>(null),
    [filter, setFilter] = useState<
      "all" | "manual" | "automatic" | "favorites"
    >("all"),
    [view, setView] = useState<"grid" | "list">("grid"),
    [searchOpen, setSearchOpen] = useState(false),
    [pending, setPending] = useState(""),
    [savedId, setSavedId] = useState<string | null>(null),
    [noticeKind, setNoticeKind] = useState<"success" | "error">("success"),
    [noticeAction, setNoticeAction] = useState(""),
    [showShortcuts, setShowShortcuts] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const submitButton = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const t = (key: Key) => translate(state.settings.language, key);
  const title = (s: Session) => s.name || t("autoName");
  const navIcons = [
    LayoutDashboard,
    FolderOpen,
    History,
    Star,
    ClipboardList,
    ArrowDownUp,
    Settings2,
  ];
  const totalTabs = state.sessions.reduce((n, s) => n + s.tabs.length, 0);
  const number = (n: number) =>
    new Intl.NumberFormat(state.settings.language).format(n);
  const ArrowForward =
    state.settings.language === "ar" ? ArrowLeft : ArrowRight;
  async function refresh() {
    try {
      const r = await chrome.runtime.sendMessage<Command, Reply>({
        type: "state",
      });
      if (r.ok && r.state) setState(r.state);
      else setNotice(t(r.error === "schema" ? "schema" : "error"));
    } catch {
      setNotice(t("error"));
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    void refresh();
    const update = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.tabharbor) void refresh();
    };
    chrome.storage.onChanged.addListener(update);
    const count = () => {
      void chrome.tabs
        .query({ windowType: "normal" })
        .then((tabs) =>
          setOpenCount(
            tabs.filter((x) => !x.incognito && safeUrl(x.url)).length,
          ),
        );
    };
    count();
    chrome.tabs.onCreated.addListener(count);
    chrome.tabs.onRemoved.addListener(count);
    chrome.tabs.onUpdated.addListener(count);
    return () => {
      chrome.storage.onChanged.removeListener(update);
      chrome.tabs.onCreated.removeListener(count);
      chrome.tabs.onRemoved.removeListener(count);
      chrome.tabs.onUpdated.removeListener(count);
    };
  }, []);
  useEffect(() => {
    setNotice("");
  }, [state.settings.language]);
  useEffect(() => {
    if (!savedId) return;
    const timer = setTimeout(() => setSavedId(null), 2200);
    return () => clearTimeout(timer);
  }, [savedId]);
  useEffect(() => {
    if (!notice || noticeKind === "error") return;
    const timer = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [notice, noticeKind]);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const target = event.target as HTMLElement;
      if (
        target.closest("input,textarea,select,[contenteditable=true]") ||
        modal ||
        document.querySelector("dialog[open]")
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        if (page === "clipboard") {
          document
            .querySelector<HTMLInputElement>(
              ".clipboard-workspace .search-field input",
            )
            ?.focus();
          return;
        }
        if (popup) setSearchOpen(true);
        else if (["settings", "transfer"].includes(page)) {
          navigate("overview");
          requestAnimationFrame(() => searchInput.current?.focus());
        } else searchInput.current?.focus();
      }
      if (event.key.toLowerCase() === "n" && !busy) {
        event.preventDefault();
        save("current");
      }
      if (event.key === "Escape") {
        setExpanded(null);
        setShowShortcuts(false);
        setQuery("");
        setSearchOpen(false);
      }
      if (event.key === "?") {
        event.preventDefault();
        setShowShortcuts((value) => !value);
      }
    };
    document.addEventListener("keydown", shortcuts);
    return () => document.removeEventListener("keydown", shortcuts);
  }, [modal, busy, page]);
  useEffect(() => {
    applyLocale(state.settings.language);
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const items = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ) ?? [],
      );
    items()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const list = items(),
          first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  async function act(c: Command) {
    if (busy) return false;
    setBusy(true);
    setPending(c.type + ("id" in c ? ":" + c.id : ""));
    setNoticeAction(c.type);
    try {
      const r = await chrome.runtime.sendMessage<Command, Reply>(c);
      if (!r.ok) {
        setNoticeKind("error");
        const key = r.error === "empty" ? "emptyError" : (r.error as Key);
        setNotice(translate(state.settings.language, key) || t("error"));
        return false;
      }
      if (r.state) setState(r.state);
      setNoticeKind(c.type === "restore" && r.failed ? "error" : "success");
      if (c.type === "save" && r.state)
        setSavedId(r.state.sessions[0]?.id ?? null);
      setNotice(
        c.type === "restore"
          ? `${r.count} ${t("restored")}${r.failed ? ` · ${r.failed} ${t("failed")}` : ""}`
          : c.type === "import"
            ? `${r.count} ${t("imported")}`
            : t("success"),
      );
      return true;
    } catch {
      setNoticeKind("error");
      setNotice(t("error"));
      return false;
    } finally {
      setBusy(false);
      setPending("");
    }
  }
  async function quickSave() {
    await act({
      type: "save",
      scope: "current",
      windowId: await windowId(),
      name: new Intl.DateTimeFormat(state.settings.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    });
  }
  function togglePreview(id: string) {
    setExpanded((current) => (current === id ? null : id));
  }
  async function windowId() {
    return (await chrome.windows.getCurrent()).id!;
  }
  function navigate(next: string) {
    setPage(next);
    location.hash = next;
    setQuery("");
    setFilter("all");
    setExpanded(null);
  }
  function save(scope: "current" | "all") {
    setName(
      new Intl.DateTimeFormat(state.settings.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    );
    setModal({ kind: "save", scope });
  }
  async function restore(s: Session, indices?: number[]) {
    await act({
      type: "restore",
      id: s.id,
      indices,
      windowId: await windowId(),
    });
  }
  function dashboard(settings = false, section?: string) {
    void chrome.tabs.create({
      url:
        chrome.runtime.getURL("dashboard.html") +
        (section ? "#" + section : settings ? "#settings" : ""),
    });
  }
  function exportBackup() {
    const blob = new Blob(
      [JSON.stringify({ schemaVersion: 1, sessions: state.sessions }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabharbor-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    if (file.size > 20_000_000) {
      setNotice(t("fileLarge"));
      return;
    }
    await act({ type: "import", text: await file.text() });
  }
  const sessions = state.sessions
    .filter(
      (s) =>
        (page === "backups"
          ? s.automatic
          : page === "favorites"
            ? s.favorite
            : page === "saved"
              ? !s.automatic
              : true) &&
        (filter === "all" ||
          (filter === "manual" && !s.automatic) ||
          (filter === "automatic" && s.automatic) ||
          (filter === "favorites" && s.favorite)) &&
        [title(s), ...s.tabs.flatMap((x) => [x.title, x.url])]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "alphabet"
        ? title(a).localeCompare(title(b), state.settings.language)
        : sort === "size"
          ? b.tabs.length - a.tabs.length
          : b.createdAt - a.createdAt,
    )
    .slice(0, popup && !query ? 8 : undefined);
  const transfer = (
    <section className="panel">
      <h2>{t("transfer")}</h2>
      <p>{t("warning")}</p>
      <div className="actions">
        <button onClick={exportBackup}>
          <Download size={17} />
          {t("export")}
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={17} />
          {t("import")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            void importBackup(e.target.files?.[0]);
            e.target.value = "";
          }}
          disabled={busy}
        />
      </div>
    </section>
  );
  return (
    <div className={popup ? "app popup" : "app"}>
      {!popup && (
        <aside>
          <div className="brand">
            <img src="icons/icon128.png" alt="" />
            <div className="brand-copy">
              <strong>TabHarbor</strong>
              <small>{t("tagline")}</small>
            </div>
          </div>
          <div className="workspace-label">{t("workspace")}</div>
          <nav>
            {(
              [
                "overview",
                "saved",
                "backups",
                "favorites",
                "clipboard",
                "transfer",
                "settings",
              ] as const
            ).map((key, i) => (
              <button
                key={key}
                className={page === key ? "nav active" : "nav"}
                onClick={() => navigate(key)}
              >
                {React.createElement(navIcons[i], {
                  size: 19,
                  "aria-hidden": true,
                })}
                <span>{t(key)}</span>
                {key === "saved" && (
                  <span className="nav-count">
                    {number(state.sessions.filter((s) => !s.automatic).length)}
                  </span>
                )}
                {key === "favorites" &&
                  state.sessions.some((s) => s.favorite) && (
                    <span className="nav-count">
                      {number(state.sessions.filter((s) => s.favorite).length)}
                    </span>
                  )}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="sidebar-privacy">
              <ShieldCheck size={21} />
              <div>
                <strong>{t("privateSpace")}</strong>
                <p>{t("deviceOnly")}</p>
              </div>
            </div>
            <small>{t("version")}</small>
          </div>
        </aside>
      )}
      <main aria-busy={busy}>
        {busy && (
          <div
            className="activity-progress"
            role="progressbar"
            aria-label={t("working")}
          />
        )}
        <header>
          <div>
            {popup ? (
              <div className="brand">
                <img src="icons/icon128.png" alt="" />
                <div className="brand-copy">
                  <strong>TabHarbor</strong>
                  <small>{t("tagline")}</small>
                </div>
              </div>
            ) : (
              <>
                <div className="eyebrow">
                  <span>TabHarbor</span>
                  <span className="breadcrumb-divider">/</span>
                  {t("workspace")}
                </div>
                <h1>{t(page as Key) || t("overview")}</h1>
              </>
            )}
          </div>
          <div className="header-tools">
            {popup && (
              <button
                className="icon-button"
                aria-label={t("clipboard")}
                onClick={() => dashboard(false, "clipboard")}
              >
                <ClipboardList size={18} />
              </button>
            )}
            {popup && (
              <button
                className="icon-button"
                aria-label={t("search")}
                aria-expanded={searchOpen}
                onClick={() => {
                  setSearchOpen((value) => !value);
                  setQuery("");
                }}
              >
                <Search size={18} />
              </button>
            )}
            {!popup && (
              <button
                className="icon-button shortcut-trigger"
                aria-label={t("shortcuts")}
                aria-expanded={showShortcuts}
                onClick={() => setShowShortcuts((value) => !value)}
              >
                <Keyboard size={18} />
              </button>
            )}
            <button
              className="icon-button"
              aria-label={t("settings")}
              onClick={() => (popup ? dashboard(true) : navigate("settings"))}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </header>
        {showShortcuts && (
          <section className="shortcut-panel">
            <strong>{t("shortcuts")}</strong>
            <span>
              <kbd>/</kbd>
              {t("search")}
            </span>
            <span>
              <kbd>N</kbd>
              {t("saveWindow")}
            </span>
            <span>
              <kbd>Esc</kbd>
              {t("close")}
            </span>
            <button
              className="icon-button"
              aria-label={t("close")}
              onClick={() => setShowShortcuts(false)}
            >
              <X size={15} />
            </button>
          </section>
        )}
        {notice && (
          <div className={"notice " + noticeKind} role="status">
            {noticeKind === "error" ? (
              <AlertCircle size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}
            <span>{notice}</span>
            {noticeAction === "delete" && state.trash && (
              <button
                className="notice-undo"
                disabled={busy}
                onClick={() => void act({ type: "undo", id: "" })}
              >
                {t("undo")}
              </button>
            )}
            <button aria-label={t("close")} onClick={() => setNotice("")}>
              <X size={17} />
            </button>
          </div>
        )}
        {!loaded ? (
          <p role="status">{t("working")}</p>
        ) : page === "clipboard" ? (
          <ClipboardPanel language={state.settings.language} />
        ) : page === "settings" ? (
          <>
            <section className="panel">
              <h2>{t("settings")}</h2>
              <div className="fields">
                <label>
                  {t("language")}
                  <select
                    value={state.settings.language}
                    disabled={busy}
                    onChange={(e) =>
                      void act({
                        type: "settings",
                        settings: {
                          ...state.settings,
                          language: e.target.value as "en" | "ar",
                        },
                      })
                    }
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </label>
                <label>
                  {t("theme")}
                  <select
                    value={state.settings.theme}
                    disabled={busy}
                    onChange={(e) =>
                      void act({
                        type: "settings",
                        settings: {
                          ...state.settings,
                          theme: e.target.value as "light" | "dark" | "system",
                        },
                      })
                    }
                  >
                    {(["system", "light", "dark"] as const).map((k) => (
                      <option key={k} value={k}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("auto")}
                  <input
                    type="checkbox"
                    checked={state.settings.autoBackup}
                    disabled={busy}
                    onChange={(e) =>
                      void act({
                        type: "settings",
                        settings: {
                          ...state.settings,
                          autoBackup: e.target.checked,
                        },
                      })
                    }
                  />
                </label>
                <label>
                  {t("retention")}
                  <select
                    value={state.settings.retention}
                    disabled={busy}
                    onChange={(e) =>
                      void act({
                        type: "settings",
                        settings: {
                          ...state.settings,
                          retention: Number(e.target.value),
                        },
                      })
                    }
                  >
                    {Array.from({ length: 100 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("behavior")}
                  <select
                    value={state.settings.restore}
                    disabled={busy}
                    onChange={(e) =>
                      void act({
                        type: "settings",
                        settings: {
                          ...state.settings,
                          restore: e.target.value as "new" | "current",
                        },
                      })
                    }
                  >
                    <option value="new">{t("newWindow")}</option>
                    <option value="current">{t("currentWindow")}</option>
                  </select>
                </label>
              </div>
            </section>
            {transfer}
            <section className="panel">
              <h2>{t("local")}</h2>
              <p>{t("privacy")}</p>
              <small>{t("version")}</small>
            </section>
          </>
        ) : page === "transfer" ? (
          transfer
        ) : (
          <>
            {(page === "overview" || popup) && (
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-kicker">
                    <span className="live-dot" />
                    {popup ? t("readyToSave") : t("privateSpace")}
                  </div>
                  {popup ? (
                    <div className="open-metric">
                      <strong>{number(openCount)}</strong>
                      <div>
                        <h2>{t("openTabs")}</h2>
                        <p>{t("readyForLater")}</p>
                      </div>
                      <Layers className="metric-icon" size={36} />
                    </div>
                  ) : (
                    <>
                      <h2>{t("welcome")}</h2>
                      <p>{t("welcomeBody")}</p>
                    </>
                  )}
                  <div className="actions hero-actions">
                    <div className="save-control">
                      <button disabled={busy} onClick={() => save("current")}>
                        <Plus size={18} />
                        {t("saveWindow")}
                        <span className="button-arrow">
                          <ArrowForward size={17} />
                        </span>
                      </button>
                      <button
                        className="quick-save"
                        disabled={busy}
                        aria-label={t("quickSave")}
                        title={t("quickSave")}
                        onClick={() => void quickSave()}
                      >
                        {pending === "save" ? (
                          <LoaderCircle size={18} className="spin" />
                        ) : (
                          <Zap size={18} />
                        )}
                      </button>
                    </div>
                    <button
                      disabled={busy}
                      className="secondary"
                      onClick={() => save("all")}
                    >
                      <Monitor size={17} />
                      {t("saveAll")}
                    </button>
                  </div>
                  {!popup && (
                    <div className="hero-reassurance">
                      <ShieldCheck size={14} />
                      {t("deviceOnly")}
                      <span />
                      <History size={14} />
                      {t(state.settings.autoBackup ? "backupOn" : "backupOff")}
                    </div>
                  )}
                </div>
                {!popup && (
                  <div className="hero-art">
                    <img src="icons/icon128.png" alt="" />
                    <div className="hero-art-caption">
                      <Check size={13} />
                      {t("safeAndReady")}
                    </div>
                  </div>
                )}
              </section>
            )}
            {!popup && page === "overview" && (
              <div className="stats">
                <button className="stat" onClick={() => navigate("saved")}>
                  <div className="stat-icon blue">
                    <FolderOpen size={21} />
                  </div>
                  <div>
                    <span>{t("saved")}</span>
                    <strong>
                      {number(
                        state.sessions.filter((s) => !s.automatic).length,
                      )}
                    </strong>
                  </div>
                  <small>{t("yourCollection")}</small>
                </button>
                <button className="stat" onClick={() => navigate("overview")}>
                  <div className="stat-icon cyan">
                    <Layers size={21} />
                  </div>
                  <div>
                    <span>{t("total")}</span>
                    <strong>{number(totalTabs)}</strong>
                  </div>
                  <small>{t("readyForLater")}</small>
                </button>
                <button className="stat" onClick={() => navigate("favorites")}>
                  <div className="stat-icon amber">
                    <Star size={21} />
                  </div>
                  <div>
                    <span>{t("favoriteCount")}</span>
                    <strong>
                      {number(state.sessions.filter((s) => s.favorite).length)}
                    </strong>
                  </div>
                  <small>{t("easyToFind")}</small>
                </button>
              </div>
            )}
            {popup && (
              <div className="popup-summary">
                <span>
                  <FolderOpen size={14} />
                  <strong>
                    {number(state.sessions.filter((s) => !s.automatic).length)}
                  </strong>
                  {t("saved")}
                </span>
                <span
                  className={
                    state.settings.autoBackup
                      ? "backup-status"
                      : "backup-status off"
                  }
                >
                  <span className="live-dot" />
                  {t(state.settings.autoBackup ? "backupOn" : "backupOff")}
                </span>
              </div>
            )}
            <div className="list-heading">
              <h2>
                {popup
                  ? t("recent")
                  : t(page === "overview" ? "recent" : (page as Key))}
              </h2>
              {popup && (
                <button className="text-button" onClick={() => dashboard()}>
                  {t("viewAll")}
                  <ArrowForward size={13} />
                </button>
              )}
              {state.trash && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void act({ type: "undo", id: "" })}
                >
                  {t("undo")}
                </button>
              )}
              {!popup && page !== "overview" && (
                <button disabled={busy} onClick={() => save("current")}>
                  <Plus size={16} />
                  {t("saveWindow")}
                </button>
              )}
            </div>
            {popup && searchOpen && (
              <div className="popup-search search-field">
                <Search size={15} />
                <input
                  ref={searchInput}
                  aria-label={t("search")}
                  placeholder={t("search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      setQuery("");
                    }
                  }}
                />
                <button
                  className="icon-button"
                  aria-label={t("close")}
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {!popup && (
              <div className="filters">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    ref={searchInput}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setQuery("");
                        searchInput.current?.blur();
                      }
                    }}
                    aria-label={t("search")}
                    placeholder={t("search")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label={t("close")}
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <select
                  aria-label={t("date")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {(["date", "alphabet", "size"] as const).map((k) => (
                    <option key={k} value={k}>
                      {t(k)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!popup && (
              <div className="collection-toolbar">
                <div
                  className="filter-chips"
                  role="group"
                  aria-label={t("filterSessions")}
                >
                  {(["all", "manual", "automatic", "favorites"] as const).map(
                    (key) => (
                      <button
                        key={key}
                        className={
                          filter === key
                            ? "filter-chip selected"
                            : "filter-chip"
                        }
                        aria-pressed={filter === key}
                        onClick={() => setFilter(key)}
                      >
                        {t(
                          key === "all"
                            ? "allSessions"
                            : key === "manual"
                              ? "saved"
                              : key === "automatic"
                                ? "backups"
                                : "favorites",
                        )}
                      </button>
                    ),
                  )}
                </div>
                <div
                  className="view-switch"
                  role="group"
                  aria-label={t("displayMode")}
                >
                  <button
                    aria-label={t("gridView")}
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    aria-label={t("listView")}
                    aria-pressed={view === "list"}
                    onClick={() => setView("list")}
                  >
                    <List size={17} />
                  </button>
                </div>
              </div>
            )}
            <div
              className={
                "cards " + (!popup && view === "list" ? "list-view" : "")
              }
            >
              {sessions.map((s) => (
                <article
                  className={
                    "session-card " +
                    (savedId === s.id ? "just-saved " : "") +
                    (expanded === s.id ? "expanded" : "")
                  }
                  key={s.id}
                >
                  <div className="card-top">
                    <div
                      className={
                        s.automatic ? "session-icon automatic" : "session-icon"
                      }
                      aria-hidden="true"
                    >
                      {s.automatic ? (
                        <History size={21} />
                      ) : (
                        <FolderOpen size={21} />
                      )}
                    </div>
                    <div className="card-title">
                      <h3>
                        <button
                          className="session-title-button"
                          aria-expanded={expanded === s.id}
                          aria-controls={"preview-" + s.id}
                          onClick={() => togglePreview(s.id)}
                        >
                          <span>{title(s)}</span>
                          <ChevronDown size={13} />
                        </button>
                      </h3>
                      <small>
                        <Clock3 size={11} />
                        {new Intl.DateTimeFormat(state.settings.language, {
                          dateStyle: "medium",
                          ...(popup ? {} : { timeStyle: "short" as const }),
                        }).format(s.createdAt)}
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={t(s.favorite ? "unpin" : "pin")}
                      disabled={busy}
                      onClick={() => void act({ type: "favorite", id: s.id })}
                    >
                      <Star
                        size={18}
                        fill={s.favorite ? "currentColor" : "none"}
                        className={s.favorite ? "is-favorite" : ""}
                      />
                    </button>
                  </div>
                  <div className="previews">
                    {s.tabs.slice(0, 3).map((tab, i) => (
                      <div key={i}>
                        <span className="domain-icon" aria-hidden="true">
                          {new URL(tab.url).hostname.charAt(0).toUpperCase()}
                        </span>
                        <span>{tab.title || new URL(tab.url).hostname}</span>
                        {tab.pinned && (
                          <Pin size={11} className="preview-pin" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="card-meta">
                    <span className="tab-count">
                      <Layers size={13} />
                      {number(s.tabs.length)} {t("tabs")}
                    </span>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelected([]);
                        setModal({ kind: "details", session: s });
                      }}
                    >
                      {t("details")}
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                  <div className="card-actions">
                    <button disabled={busy} onClick={() => void restore(s)}>
                      {pending === "restore:" + s.id ? (
                        <LoaderCircle size={14} className="spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      {t("restore")}
                    </button>
                    {!popup && (
                      <>
                        <button
                          className="secondary card-tool"
                          aria-label={t("rename")}
                          title={t("rename")}
                          onClick={() => {
                            setName(title(s));
                            setModal({ kind: "rename", session: s });
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="danger card-tool"
                          aria-label={t("delete")}
                          title={t("delete")}
                          onClick={() =>
                            setModal({ kind: "delete", session: s })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                  {expanded === s.id && (
                    <div className="expanded-tabs" id={"preview-" + s.id}>
                      <div className="preview-heading">
                        <span>
                          {number(s.tabs.length)} {t("tabs")}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelected([]);
                            setModal({ kind: "details", session: s });
                          }}
                        >
                          {t("selectTabs")}
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                      {s.tabs.map((tab, i) => (
                        <div className="expanded-tab" key={i}>
                          <span className="domain-icon">
                            {new URL(tab.url).hostname.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <strong>
                              {tab.title || new URL(tab.url).hostname}
                            </strong>
                            <bdi>{new URL(tab.url).hostname}</bdi>
                          </div>
                          <button
                            className="icon-button"
                            disabled={busy}
                            aria-label={t("restoreTab") + ": " + tab.title}
                            title={t("restoreTab")}
                            onClick={() => void restore(s, [i])}
                          >
                            <ArrowUpRight size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
              {!sessions.length && (
                <section className="empty">
                  <div className="empty-icon" aria-hidden="true">
                    {query ? <Search size={30} /> : <Archive size={30} />}
                  </div>
                  <h3>{t(query ? "noResults" : "empty")}</h3>
                  <p>{t(query ? "trySearch" : "emptyBody")}</p>
                  {query && (
                    <button
                      className="secondary clear-search"
                      onClick={() => {
                        setQuery("");
                        searchInput.current?.focus();
                      }}
                    >
                      {t("clearSearch")}
                    </button>
                  )}
                </section>
              )}
            </div>
          </>
        )}
        {popup && (
          <footer>
            <button className="secondary full" onClick={() => dashboard()}>
              <LayoutDashboard size={17} />
              {t("open")}
              <ArrowForward size={16} />
            </button>
            <small>
              <LockKeyhole size={11} />
              {t("local")}
            </small>
          </footer>
        )}
      </main>
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setModal(null);
            }}
          >
            <h2 id="dialog-title">
              {modal.kind === "save"
                ? t("name")
                : modal.kind === "details"
                  ? title(modal.session!)
                  : t(modal.kind)}
            </h2>
            {modal.kind === "delete" ? (
              <p>{t("deleteConfirm")}</p>
            ) : modal.kind === "details" ? (
              <>
                <label className="select-all">
                  <input
                    type="checkbox"
                    checked={selected.length === modal.session!.tabs.length}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? modal.session!.tabs.map((_, i) => i)
                          : [],
                      )
                    }
                  />
                  {t("all")}
                </label>
                <div className="tab-list">
                  {modal.session!.tabs.map((tab, i) => (
                    <label key={i}>
                      <input
                        type="checkbox"
                        checked={selected.includes(i)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, i]
                              : selected.filter((x) => x !== i),
                          )
                        }
                      />
                      <span>
                        <strong>
                          {tab.pinned ? <Pin size={12} /> : null}
                          {tab.title}
                        </strong>
                        <bdi>{tab.url}</bdi>
                      </span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <input
                autoFocus
                maxLength={200}
                aria-label={t("name")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitButton.current?.click();
                  }
                }}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <div className="actions">
              <button className="secondary" onClick={() => setModal(null)}>
                {t("cancel")}
              </button>
              <button
                ref={submitButton}
                disabled={
                  busy ||
                  (modal.kind === "details"
                    ? !selected.length
                    : modal.kind !== "delete" && !name.trim())
                }
                onClick={() =>
                  void (async () => {
                    let ok = false;
                    if (modal.kind === "save")
                      ok = await act({
                        type: "save",
                        scope: modal.scope!,
                        name,
                        windowId: await windowId(),
                      });
                    if (modal.kind === "rename")
                      ok = await act({
                        type: "rename",
                        id: modal.session!.id,
                        name,
                      });
                    if (modal.kind === "delete")
                      ok = await act({ type: "delete", id: modal.session!.id });
                    if (modal.kind === "details")
                      ok = await act({
                        type: "restore",
                        id: modal.session!.id,
                        indices: selected,
                        windowId: await windowId(),
                      });
                    if (ok) setModal(null);
                  })()
                }
              >
                {busy && <LoaderCircle className="spin" size={15} />}
                {modal.kind === "details"
                  ? t("selected")
                  : modal.kind === "delete"
                    ? t("confirm")
                    : t("save")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
