import type { IconComponent } from "../ui/Icons";
import {
  BookOpenText,
  ClipboardCheck,
  FolderArchive,
  LayoutDashboard,
  PanelLeftClose,
  Plus,
  Sparkles
} from "../ui/Icons";

export type AppView = "dashboard" | "intake" | "scope" | "documents" | "export";

interface AppNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onNewProject: () => void;
}

const navigationItems: Array<{ id: AppView; label: string; icon: IconComponent }> = [
  { id: "dashboard", label: "Mission Control", icon: LayoutDashboard },
  { id: "intake", label: "Guided Intake", icon: ClipboardCheck },
  { id: "scope", label: "Scope Review", icon: BookOpenText },
  { id: "documents", label: "Documents", icon: Sparkles },
  { id: "export", label: "Export", icon: FolderArchive }
];

export function AppNavigation({ currentView, onNavigate, onNewProject }: AppNavigationProps) {
  return (
    <aside className="app-navigation" aria-label="Primary navigation">
      <div className="brand">
        <img
          className="brand-logo"
          src="/branding/project-builder-ai-horizontal.png"
          alt="Project Builder Ai"
          width={205}
          height={48}
        />
      </div>

      <button className="button button-primary mobile-new-project" onClick={onNewProject}>
        <Plus size={17} aria-hidden="true" />
        New project
      </button>

      <nav className="nav-list">
        {navigationItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${currentView === id ? "is-active" : ""}`}
            onClick={() => onNavigate(id)}
            aria-current={currentView === id ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-footer">
        <PanelLeftClose size={18} aria-hidden="true" />
        <span>Project workspace</span>
      </div>
    </aside>
  );
}
