import { Plus } from "../ui/Icons";

interface AppHeaderProps {
  onNewProject: () => void;
}

export function AppHeader({ onNewProject }: AppHeaderProps) {
  return (
    <header className="app-header">
      <span className="header-context">Project workspace</span>
      <button className="button button-primary" onClick={onNewProject}>
        <Plus size={17} aria-hidden="true" />
        New project
      </button>
    </header>
  );
}
