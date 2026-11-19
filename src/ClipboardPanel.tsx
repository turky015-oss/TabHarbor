import React, { useEffect, useRef, useState } from "react";
import {
  ClipboardList,
  ClipboardPaste,
  Copy,
  Image as ImageIcon,
  Type,
  Pin,
  Trash2,
  Search,
  Upload,
  Pause,
  Play,
  Check,
  X,
  ShieldCheck,
  LoaderCircle,
  Download,
} from "lucide-react";
import { translate, type Key } from "./i18n";
import { imagePayload, payloadFromPaste, pngBlob } from "./clipboard-media";
import {
  clipDefaults,
  type ClipCommand,
  type ClipConfig,
  type ClipPayload,
  type ClipRecord,
  type ClipReply,
  type ClipSummary,
} from "./clipboard-model";
export function ClipboardPanel({ language }: { language: "ar" | "en" }) {
  const t = (key: Key) => translate(language, key);
  const [entries, setEntries] = useState<ClipSummary[]>([]),
    [config, setConfig] = useState<ClipConfig>(clipDefaults),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"all" | "text" | "image" | "pinned">("all"),
    [draft, setDraft] = useState(""),
    [detail, setDetail] = useState<ClipRecord | null>(null),
    [confirm, setConfirm] = useState<string | null>(null),
    [copied, setCopied] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    confirmDialog = useRef<HTMLDialogElement>(null),
    mounted = useRef(true);
  async function send(command: ClipCommand): Promise<ClipReply> {
    return chrome.runtime.sendMessage(command);
  }
  function apply(r: ClipReply) {
    if (!mounted.current) return;
    if (!r.ok) {
      setNotice(t((r.error || "clipStorage") as Key) || t("clipStorage"));
      return;
    }
    if (r.entries) setEntries(r.entries);
    if (r.config) setConfig(r.config);
  }
  async function refresh() {
    try {
      apply(await send({ type: "clip:list" }));
    } catch {
      if (mounted.current) setNotice(t("clipStorage"));
    }
  }
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const changed = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.clipboardConfig || changes.clipboardRevision) void refresh();
    };
    chrome.storage.onChanged.addListener(changed);
    return () => {
      mounted.current = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);
  useEffect(() => setNotice(""), [language]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  useEffect(() => {
    if (detail) dialog.current?.showModal();
    else dialog.current?.close();
  }, [detail]);
  useEffect(() => {
    if (confirm) confirmDialog.current?.showModal();
    else confirmDialog.current?.close();
  }, [confirm]);
  async function run(command: ClipCommand, success?: Key) {
    setBusy(true);
    setNotice("");
    try {
      const result = await send(command);
      apply(result);
      if (result.ok && success) setNotice(t(success));
      return result;
    } catch {
      setNotice(t("clipStorage"));
      return { ok: false } as ClipReply;
    } finally {
      setBusy(false);
    }
  }
  async function save(payload: ClipPayload) {
    return (await run({ type: "clip:add", payload }, "clipSaved")).ok;
  }
  async function file(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      await save(await imagePayload(file));
    } catch (e) {
      setNotice(
        t(e instanceof Error ? (e.message as Key) : "clipInvalid") ||
          t("clipInvalid"),
      );
    } finally {
      setBusy(false);
    }
  }
  async function automatic(enabled: boolean) {
    setBusy(true);
    try {
      if (
        enabled &&
        !(await chrome.permissions.request({
          permissions: ["clipboardRead", "offscreen"],
        }))
      ) {
        setNotice(t("clipPermission"));
        return;
      }
      await run({ type: "clip:config", enabled, retention: config.retention });
    } catch {
      setNotice(t("clipPermission"));
    } finally {
      setBusy(false);
    }
  }
  async function captureCurrent() {
    setBusy(true);
    setNotice("");
    try {
      if (
        !(await chrome.permissions.request({ permissions: ["clipboardRead"] }))
      )
        throw Error("clipPermission");
      const values = await navigator.clipboard.read();
      for (const value of values) {
        if (value.types.includes("image/png")) {
          await save(await imagePayload(await value.getType("image/png")));
          return;
        }
        if (value.types.includes("text/plain")) {
          await save({
            kind: "text",
            data: await (await value.getType("text/plain")).text(),
          });
          return;
        }
      }
      setNotice(t("clipEmpty"));
    } catch (e) {
      setNotice(
        t(
          e instanceof Error && e.message === "clipPermission"
            ? "clipPermission"
            : "clipReadFailed",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy(id: string) {
    setBusy(true);
    try {
      if (
        !(await chrome.permissions.request({ permissions: ["clipboardWrite"] }))
      )
        throw Error("clipPermission");
      const result = await send({ type: "clip:get", id });
      if (!result.ok || !result.record) throw Error("clipStorage");
      const record = result.record;
      if (record.kind === "text")
        await navigator.clipboard.writeText(record.data);
      else
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob(record.data) }),
        ]);
      setCopied(id);
      setNotice(t("clipCopied"));
    } catch (e) {
      setNotice(
        t(
          e instanceof Error && e.message === "clipPermission"
            ? "clipPermission"
            : "clipCopyFailed",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function preview(id: string) {
    const result = await run({ type: "clip:get", id });
    if (result.record) setDetail(result.record);
  }
  async function download(record: ClipRecord) {
    const blob =
      record.kind === "image"
        ? pngBlob(record.data)
        : new Blob([record.data], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `tabharbor-clipboard-${record.createdAt}.${record.kind === "image" ? "png" : "txt"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filtered = entries.filter(
    (entry) =>
      (filter === "all" ||
        (filter === "pinned" && entry.pinned) ||
        entry.kind === filter) &&
      (!query || entry.preview.toLowerCase().includes(query.toLowerCase())),
  );
  return (
    <div
      className="clipboard-workspace"
      onPaste={(event) => {
        if (
          (event.target as HTMLElement).closest("textarea,input") &&
          !Array.from(event.clipboardData.files).some((f) =>
            f.type.startsWith("image/"),
          )
        )
          return;
        event.preventDefault();
        void payloadFromPaste(event.clipboardData)
          .then(async (p) => {
            if (p) await save(p);
            else setNotice(t("clipEmpty"));
          })
          .catch(() => setNotice(t("clipInvalid")));
      }}
    >
      <section className="panel clipboard-intro">
        <div>
          <div className="hero-kicker">
            <ShieldCheck size={14} />
            {t("clipLocal")}
          </div>
          <h2>{t("clipHeadline")}</h2>
          <p>{t("clipExplain")}</p>
        </div>
        <div className="clip-auto-controls">
          <button
            className={config.enabled ? "secondary" : "enable-auto"}
            disabled={busy}
            onClick={() => void automatic(!config.enabled)}
          >
            {config.enabled ? <Pause size={16} /> : <Play size={16} />}{" "}
            {t(config.enabled ? "clipPause" : "clipEnable")}
          </button>
          <span
            className={
              config.enabled ? "monitor-state active" : "monitor-state"
            }
          >
            <span className="live-dot" />
            {t(config.enabled ? "clipMonitoring" : "clipPaused")}
          </span>
        </div>
      </section>
      <p className="clipboard-disclosure">{t("clipSensitive")}</p>
      {config.enabled && config.lastError && (
        <div className="notice error" role="status">
          {t(config.lastError as Key) || t("clipReadFailed")}
          <button onClick={() => void captureCurrent()}>
            {t("clipCapture")}
          </button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button aria-label={t("close")} onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <section className="panel clip-composer">
        <div className="clip-composer-title">
          <ClipboardPaste size={20} />
          <h2>{t("clipAdd")}</h2>
          <span>{t("clipPasteHint")}</span>
        </div>
        <textarea
          aria-label={t("clipText")}
          placeholder={t("clipTextHint")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="clip-compose-actions">
          <button
            disabled={busy || !draft.length}
            onClick={() =>
              void save({ kind: "text", data: draft }).then((ok) => {
                if (ok) setDraft("");
              })
            }
          >
            <Type size={16} />
            {t("clipSaveText")}
          </button>
          <button
            disabled={busy}
            className="secondary"
            onClick={() => upload.current?.click()}
          >
            <Upload size={16} />
            {t("clipUpload")}
          </button>
          <button
            disabled={busy}
            className="secondary"
            onClick={() => void captureCurrent()}
          >
            <ClipboardPaste size={16} />
            {t("clipCapture")}
          </button>
          <input
            ref={upload}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              void file(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {busy && <LoaderCircle size={17} className="spin" />}
        </div>
      </section>
      <div className="clip-history-heading">
        <h2>
          {t("clipHistory")} <span>{entries.length}</span>
        </h2>
        <label>
          {t("clipRetention")}
          <select
            aria-label={t("clipRetention")}
            value={config.retention}
            disabled={busy}
            onChange={(e) =>
              void run({
                type: "clip:config",
                enabled: config.enabled,
                retention: Number(e.target.value),
              })
            }
          >
            {[10, 25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || !entries.length}
          className="secondary danger"
          onClick={() => setConfirm("clear")}
        >
          <Trash2 size={15} />
          {t("clipClear")}
        </button>
      </div>
      <div className="collection-toolbar">
        <div className="filter-chips">
          {(["all", "text", "image", "pinned"] as const).map((key) => (
            <button
              className={
                filter === key ? "filter-chip selected" : "filter-chip"
              }
              aria-pressed={filter === key}
              key={key}
              onClick={() => setFilter(key)}
            >
              {t(
                key === "all"
                  ? "clipAll"
                  : key === "text"
                    ? "clipTexts"
                    : key === "image"
                      ? "clipImages"
                      : "clipPinned",
              )}
            </button>
          ))}
        </div>
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label={t("clipSearch")}
            placeholder={t("clipSearch")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <dialog
        ref={confirmDialog}
        onCancel={() => setConfirm(null)}
        className="clip-confirm-dialog dialog"
        aria-label={t("clipConfirm")}
        role="alertdialog"
      >
        {confirm && (
          <div className="clip-confirm">
            <p>
              {t(
                confirm === "clear" ? "clipClearConfirm" : "clipDeleteConfirm",
              )}
            </p>
            <button className="secondary" onClick={() => setConfirm(null)}>
              {t("cancel")}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(
                  confirm === "clear"
                    ? { type: "clip:clear" }
                    : { type: "clip:delete", id: confirm },
                ).then((r) => {
                  if (r.ok) setConfirm(null);
                })
              }
            >
              {t("confirm")}
            </button>
          </div>
        )}
      </dialog>
      <div className="clip-grid">
        {filtered.map((entry) => (
          <article className="clip-card" key={entry.id}>
            <button
              className="clip-content"
              aria-label={t("clipPreview")}
              onClick={() => void preview(entry.id)}
            >
              {entry.kind === "image" ? (
                entry.thumbnail ? (
                  <img src={entry.thumbnail} alt={t("clipImage")} />
                ) : (
                  <ImageIcon size={35} />
                )
              ) : (
                <p dir="auto">{entry.preview}</p>
              )}
            </button>
            <div className="clip-card-meta">
              <span>
                {entry.kind === "image" ? (
                  <ImageIcon size={13} />
                ) : (
                  <Type size={13} />
                )}{" "}
                {t(entry.kind === "image" ? "clipImage" : "clipText")} ·{" "}
                {new Intl.DateTimeFormat(language, {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(entry.createdAt)}
              </span>
              <small>{Math.max(1, Math.round(entry.bytes / 1024))} KB</small>
            </div>
            <div className="clip-card-actions">
              <button disabled={busy} onClick={() => void copy(entry.id)}>
                {copied === entry.id ? <Check size={14} /> : <Copy size={14} />}{" "}
                {t(copied === entry.id ? "clipCopied" : "clipCopy")}
              </button>
              <button
                className="icon-button"
                disabled={busy}
                aria-label={t(entry.pinned ? "unpin" : "pin")}
                onClick={() => void run({ type: "clip:pin", id: entry.id })}
              >
                <Pin size={16} fill={entry.pinned ? "currentColor" : "none"} />
              </button>
              <button
                className="icon-button danger"
                disabled={busy}
                aria-label={t("delete")}
                onClick={() => setConfirm(entry.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <section className="empty">
          <div className="empty-icon">
            <ClipboardList size={30} />
          </div>
          <h3>{t("clipEmptyTitle")}</h3>
          <p>{t("clipEmptyBody")}</p>
        </section>
      )}
      <p className="clip-footnote">{t("clipLimits")}</p>
      <dialog
        ref={dialog}
        className="dialog clip-detail"
        onCancel={() => setDetail(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDetail(null);
        }}
      >
        {detail && (
          <>
            <div className="clip-detail-header">
              <h2>{t("clipPreview")}</h2>
              <button
                className="icon-button"
                aria-label={t("close")}
                onClick={() => setDetail(null)}
              >
                <X size={18} />
              </button>
            </div>
            {detail.kind === "image" ? (
              <img src={detail.data} alt={t("clipImage")} />
            ) : (
              <pre dir="auto">{detail.data}</pre>
            )}
            <div className="actions">
              <button disabled={busy} onClick={() => void copy(detail.id)}>
                <Copy size={16} />
                {t("clipCopy")}
              </button>
              <button
                className="secondary"
                onClick={() => void download(detail)}
              >
                <Download size={16} />
                {t("clipDownload")}
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
