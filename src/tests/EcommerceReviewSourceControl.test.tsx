import { fireEvent, render, screen, within } from "@testing-library/react";
import { ClientReviewWorkflow } from "../components/ClientReview/ClientReviewWorkflow";
import { deriveReviewItems } from "../lib/clientReview";
import { createEcommerceFixture } from "./helpers/ecommerce";
import { createBusinessWebsite, websiteReviewDecision } from "./helpers/businessWebsite";

describe("ecommerce source-controlled Client Review cards", () => {
  it("shows the intake source and offers no status or reason controls", () => {
    const project = createEcommerceFixture();
    project.intake.ecommerceCartScope = "";
    project.reviewItems = deriveReviewItems(project);
    const onUpdate = vi.fn();
    render(<ClientReviewWorkflow project={project} onUpdateReviewItem={onUpdate} onToggleReadiness={vi.fn()} />);

    const heading = screen.getByRole("heading", { name: /EC-CART: Confirm shared or separate cart scope/i });
    const card = heading.closest("article")!;
    expect(within(card).getByText(/Source field/i)).toBeInTheDocument();
    expect(within(card).getByText(/Cart scope decision/i)).toBeInTheDocument();
    expect(within(card).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();
    const deferredHeading = screen.getByRole("heading", { name: /OQ-01: What CAD order subtotal/i });
    const deferredCard = deferredHeading.closest("article")!;
    expect(within(deferredCard).getByText("Assumptions")).toBeInTheDocument();
    expect(within(deferredCard).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(deferredCard).queryByRole("textbox")).not.toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("keeps ordinary stored review cards editable for backward compatibility", () => {
    const project = createBusinessWebsite();
    project.reviewItems = [websiteReviewDecision({ id: "ordinary-review", status: "Needs answer" })];
    const onUpdate = vi.fn();
    render(<ClientReviewWorkflow project={project} onUpdateReviewItem={onUpdate} onToggleReadiness={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), { target: { value: "Answered" } });
    expect(onUpdate).toHaveBeenCalledWith("ordinary-review", { status: "Answered" });
  });
});
