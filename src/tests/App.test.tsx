import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../app/App";

describe("App", () => {
  it("opens a selected intake stage from Mission Control", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Users: 33% complete/i }));

    expect(screen.getByRole("heading", { name: "Define users and roles" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Target users/i)).toHaveValue(
      "Residents\nProgram coordinators\nDepartment reviewers"
    );
  });

  it("shows generated documents without injecting HTML", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));
    expect(screen.getByRole("heading", { name: "Documentation Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /CLIENT_REQUIREMENTS\.md/i }));
    expect(screen.getByText(/\[MISSING: user roles\]/)).toBeInTheDocument();
  });
});
