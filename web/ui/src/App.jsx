import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  GitBranch,
  Loader2,
  Map,
  PanelRight,
  Play,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Wand2
} from "lucide-react";
import { apiGet, apiPost, assetUrl } from "./api.js";

const STATUS_LABELS = {
  drafted: "已有正文",
  "handoff-only": "接手说明",
  "outline-only": "仅有大纲",
  missing: "缺失"
};

const RUN_STATUS_LABELS = {
  draft: "待运行",
  running_review: "只读审稿中",
  review_failed: "审稿失败",
  awaiting_confirmation: "待确认",
  running_edit: "改稿中",
  verification_failed: "验证失败",
  done: "完成"
};

export default function App() {
  const [project, setProject] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState("");
  const [activeRun, setActiveRun] = useState(null);
  const [view, setView] = useState("console");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirtyStatus, setDirtyStatus] = useState("");
  const [confirmDirty, setConfirmDirty] = useState(false);
  const [acceptedFinding, setAcceptedFinding] = useState("");

  useEffect(() => {
    loadProject();
    loadRuns();
  }, []);

  useEffect(() => {
    if (!project || chapter) return;
    const defaultChapter = project.chapters.find((item) => item.id === "chapter-2") || project.chapters[0];
    if (defaultChapter) selectChapter(defaultChapter.id);
  }, [project, chapter]);

  useEffect(() => {
    if (!activeRunId) return undefined;
    let stopped = false;
    const poll = async () => {
      try {
        const data = await apiGet(`/api/runs/${activeRunId}`);
        if (!stopped) setActiveRun(data);
        if (["awaiting_confirmation", "review_failed", "done", "verification_failed"].includes(data.status)) {
          await loadProject();
          await loadRuns();
        }
      } catch (pollError) {
        if (!stopped) setError(pollError.message);
      }
    };
    poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [activeRunId]);

  const selectedChapter = useMemo(() => {
    if (!project || !chapter) return null;
    return project.chapters.find((item) => item.id === chapter.id);
  }, [project, chapter]);

  const chapterReviews = useMemo(() => {
    if (!project || !chapter) return [];
    return project.reviews.filter((review) => !review.chapterId || review.chapterId === chapter.id);
  }, [project, chapter]);

  async function loadProject() {
    const data = await apiGet("/api/project");
    setProject(data);
  }

  async function loadRuns() {
    const data = await apiGet("/api/runs");
    setRuns(data.runs || []);
  }

  async function selectChapter(id) {
    setError("");
    const data = await apiGet(`/api/chapters/${id}`);
    setChapter(data);
    setView("reader");
  }

  async function runReview() {
    if (!chapter || !project) return;
    setBusy(true);
    setError("");
    try {
      const run = await apiPost("/api/runs/review", {
        workId: project.work.id,
        chapterId: chapter.id,
        mode: "chapter-review"
      });
      setActiveRunId(run.id);
      await loadRuns();
    } catch (runError) {
      setError(runError.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshDirtyStatus() {
    const data = await apiGet("/api/git/status");
    setDirtyStatus(data.status || "");
  }

  async function runEdit() {
    if (!chapter || !project) return;
    setBusy(true);
    setError("");
    try {
      const run = await apiPost("/api/runs/edit", {
        workId: project.work.id,
        chapterId: chapter.id,
        reviewRunId: activeRun?.phase === "review" ? activeRun.id : "",
        acceptedFindings: acceptedFinding ? [acceptedFinding] : [],
        confirmDirty
      });
      setActiveRunId(run.id);
      await loadRuns();
    } catch (runError) {
      if (runError.status === 409) {
        setDirtyStatus(runError.payload?.status || "");
      }
      setError(runError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!project) {
    return (
      <main className="loading">
        <Loader2 className="spin" size={22} />
        <span>正在读取项目索引</span>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SF</div>
          <div>
            <strong>Story Foundry</strong>
            <span>{project.work.title}</span>
          </div>
        </div>
        <nav className="nav">
          <button className={view === "console" ? "active" : ""} onClick={() => setView("console")}>
            <ClipboardList size={17} /> 控制台
          </button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>
            <Map size={17} /> 章节地图
          </button>
          <button className={view === "reader" ? "active" : ""} onClick={() => setView("reader")}>
            <BookOpen size={17} /> 审稿阅读器
          </button>
          <button className={view === "runner" ? "active" : ""} onClick={() => setView("runner")}>
            <Play size={17} /> Runner
          </button>
        </nav>
        <div className="side-meta">
          <span>{project.work.stage}</span>
          <span>{project.dashboard.progress.drafted}/{project.dashboard.progress.outlined} 章</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>{project.work.title}</h1>
            <p>{project.dashboard.readmeSummary}</p>
          </div>
          <div className="toolbar">
            <button title="刷新索引" onClick={loadProject}>
              <RefreshCw size={16} /> 刷新
            </button>
            <button title="检查 git 状态" onClick={refreshDirtyStatus}>
              <GitBranch size={16} /> Git
            </button>
          </div>
        </header>

        {error && (
          <div className="notice error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {dirtyStatus && (
          <div className="notice">
            <GitBranch size={16} />
            <pre>{dirtyStatus}</pre>
          </div>
        )}

        {view === "console" && (
          <ConsoleView project={project} onSelectChapter={selectChapter} />
        )}
        {view === "map" && (
          <ChapterMap chapters={project.chapters} selectedId={chapter?.id} onSelectChapter={selectChapter} />
        )}
        {view === "reader" && (
          <ReaderView
            project={project}
            chapter={chapter}
            selectedChapter={selectedChapter}
            reviews={chapterReviews}
            onSelectChapter={selectChapter}
            onRunReview={runReview}
            busy={busy}
          />
        )}
        {view === "runner" && (
          <RunnerView
            chapter={chapter}
            runs={runs}
            activeRun={activeRun}
            activeRunId={activeRunId}
            setActiveRunId={setActiveRunId}
            runReview={runReview}
            runEdit={runEdit}
            busy={busy}
            confirmDirty={confirmDirty}
            setConfirmDirty={setConfirmDirty}
            acceptedFinding={acceptedFinding}
            setAcceptedFinding={setAcceptedFinding}
          />
        )}
      </main>
    </div>
  );
}

function ConsoleView({ project, onSelectChapter }) {
  return (
    <section className="console-grid">
      <div className="hero-panel">
        <div>
          <h2>项目状态</h2>
          <MetricRow label="阶段" value={project.work.stage} />
          <MetricRow label="正文" value={`${project.dashboard.progress.drafted} 章`} />
          <MetricRow label="大纲" value={`${project.dashboard.progress.outlined} 章`} />
          <MetricRow label="接手说明" value={`${project.dashboard.progress.handoffOnly} 章`} />
        </div>
        {project.coverImage && (
          <img
            src={assetUrl(project.coverImage, project.work.id)}
            alt={`${project.work.title} 设定图`}
          />
        )}
      </div>
      <Panel title="开放任务" icon={<ClipboardList size={17} />}>
        <List items={project.dashboard.openTasks} />
      </Panel>
      <Panel title="阻塞项" icon={<AlertTriangle size={17} />}>
        <List items={project.dashboard.blockers} />
      </Panel>
      <Panel title="下一步" icon={<ChevronRight size={17} />}>
        <List items={project.dashboard.next} />
      </Panel>
      <Panel title="最近章节" icon={<BookOpen size={17} />} wide>
        <div className="chapter-table compact">
          {project.chapters.slice(0, 6).map((item) => (
            <button key={item.id} onClick={() => onSelectChapter(item.id)}>
              <span>{item.title}</span>
              <StatusPill status={item.status} />
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function ChapterMap({ chapters, selectedId, onSelectChapter }) {
  return (
    <section className="panel full">
      <div className="panel-heading">
        <Map size={18} />
        <h2>章节地图</h2>
      </div>
      <div className="chapter-map">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            className={chapter.id === selectedId ? "chapter-row selected" : "chapter-row"}
            onClick={() => onSelectChapter(chapter.id)}
          >
            <span className="chapter-num">{chapter.number}</span>
            <span className="chapter-main">
              <strong>{chapter.title}</strong>
              <small>{chapter.summary || chapter.outlineTitle || "未写摘要"}</small>
            </span>
            <span className="chapter-files">
              {chapter.hasDraft && <FileBadge label="正文" />}
              {chapter.hasOutline && <FileBadge label="大纲" />}
              {chapter.hasHandoff && <FileBadge label="接手" />}
            </span>
            <StatusPill status={chapter.status} />
          </button>
        ))}
      </div>
    </section>
  );
}

function ReaderView({ project, chapter, selectedChapter, reviews, onSelectChapter, onRunReview, busy }) {
  if (!chapter) {
    return (
      <section className="empty">
        <ScrollText size={22} />
        <span>请选择章节</span>
      </section>
    );
  }
  return (
    <section className="reader-layout">
      <div className="reader-main">
        <div className="reader-header">
          <div>
            <h2>{chapter.title}</h2>
            <p>{chapter.draftPath || chapter.handoffPath || chapter.outlinePath}</p>
          </div>
          <button disabled={busy} onClick={onRunReview} title="启动只读审稿">
            {busy ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
            只读审稿
          </button>
        </div>
        <MarkdownText content={chapter.content} />
      </div>
      <aside className="review-rail">
        <Panel title="章节状态" icon={<PanelRight size={17} />}>
          <dl className="meta-list">
            <dt>状态</dt>
            <dd><StatusPill status={selectedChapter?.status || chapter.status} /></dd>
            <dt>字数</dt>
            <dd>{selectedChapter?.wordCount || chapter.wordCount || 0}</dd>
            <dt>作品</dt>
            <dd>{project.work.title}</dd>
          </dl>
        </Panel>
        <Panel title="事实源" icon={<ShieldCheck size={17} />}>
          <div className="source-list">
            {chapter.sourceRefs.map((source) => (
              <a key={source.path} href={`#${source.path}`} title={source.path}>
                <span>{source.label}</span>
                <small>{source.reason}</small>
              </a>
            ))}
          </div>
        </Panel>
        <Panel title="审稿报告" icon={<FileText size={17} />}>
          {reviews.length ? (
            <div className="review-list">
              {reviews.map((review) => (
                <div key={review.path} className="review-item">
                  <strong>{review.title}</strong>
                  <span>{review.path}</span>
                  {review.findings.slice(0, 3).map((finding) => (
                    <small key={finding}>{finding}</small>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">暂无审稿报告</p>
          )}
        </Panel>
        <Panel title="切换章节" icon={<BookOpen size={17} />}>
          <div className="chapter-switcher">
            {project.chapters.map((item) => (
              <button key={item.id} onClick={() => onSelectChapter(item.id)}>
                {item.id.replace("chapter-", "第 ")} 章
              </button>
            ))}
          </div>
        </Panel>
      </aside>
    </section>
  );
}

function RunnerView({
  chapter,
  runs,
  activeRun,
  activeRunId,
  setActiveRunId,
  runReview,
  runEdit,
  busy,
  confirmDirty,
  setConfirmDirty,
  acceptedFinding,
  setAcceptedFinding
}) {
  return (
    <section className="runner-layout">
      <div className="runner-main">
        <div className="runner-actions">
          <h2>Codex Runner</h2>
          <div className="toolbar">
            <button disabled={busy || !chapter} onClick={runReview} title="用 read-only sandbox 启动审稿">
              {busy ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
              只读审稿
            </button>
            <button disabled={busy || !chapter} onClick={runEdit} title="确认后用 workspace-write sandbox 改稿">
              <Wand2 size={16} />
              确认改稿
            </button>
          </div>
        </div>
        <label className="field">
          <span>确认的 finding</span>
          <textarea
            value={acceptedFinding}
            onChange={(event) => setAcceptedFinding(event.target.value)}
            placeholder="填写要采用的失败点或改法"
          />
        </label>
        <label className="checkline">
          <input
            type="checkbox"
            checked={confirmDirty}
            onChange={(event) => setConfirmDirty(event.target.checked)}
          />
          <span>已确认当前 git 改动，允许启动写入阶段</span>
        </label>
        {activeRun && (
          <div className="run-detail">
            <div className="run-title">
              <StatusDot status={activeRun.status} />
              <strong>{activeRun.id}</strong>
              <span>{RUN_STATUS_LABELS[activeRun.status] || activeRun.status}</span>
            </div>
            {activeRun.reportPath && <p>报告：{activeRun.reportPath}</p>}
            <pre>{activeRun.finalMessage || activeRun.events || activeRun.stderr || "等待输出"}</pre>
          </div>
        )}
      </div>
      <aside className="run-list">
        <div className="panel-heading">
          <ScrollText size={18} />
          <h2>运行记录</h2>
        </div>
        {runs.length ? (
          runs.map((run) => (
            <button
              key={run.id}
              className={run.id === activeRunId ? "run-row selected" : "run-row"}
              onClick={() => setActiveRunId(run.id)}
            >
              <span><StatusDot status={run.status} /> {run.id}</span>
              <small>{RUN_STATUS_LABELS[run.status] || run.status}</small>
            </button>
          ))
        ) : (
          <p className="muted">暂无运行记录</p>
        )}
      </aside>
    </section>
  );
}

function Panel({ title, icon, children, wide = false }) {
  return (
    <section className={wide ? "panel wide" : "panel"}>
      <div className="panel-heading">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function List({ items }) {
  if (!items?.length) return <p className="muted">暂无</p>;
  return (
    <ul className="plain-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`status-pill ${status}`}>{STATUS_LABELS[status] || status}</span>;
}

function FileBadge({ label }) {
  return <span className="file-badge">{label}</span>;
}

function StatusDot({ status }) {
  const ok = ["awaiting_confirmation", "done"].includes(status);
  const bad = ["review_failed", "verification_failed"].includes(status);
  return <span className={bad ? "dot bad" : ok ? "dot ok" : "dot"} />;
}

function MarkdownText({ content }) {
  const blocks = (content || "").split(/\n{2,}/);
  return (
    <article className="markdown-reader">
      {blocks.map((block, index) => {
        const text = block.trim();
        if (!text) return null;
        if (text.startsWith("# ")) return <h1 key={index}>{text.replace(/^#\s+/, "")}</h1>;
        if (text.startsWith("## ")) return <h2 key={index}>{text.replace(/^##\s+/, "")}</h2>;
        if (text.startsWith("- ")) {
          return (
            <ul key={index}>
              {text.split(/\n/).map((line) => <li key={line}>{line.replace(/^-\s+/, "")}</li>)}
            </ul>
          );
        }
        return <p key={index}>{text}</p>;
      })}
    </article>
  );
}
