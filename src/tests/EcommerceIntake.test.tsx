import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../app/App";
import { seedApp } from "./helpers/appTestHelpers";
import { createEcommerceFixture } from "./helpers/ecommerce";
import { loadStorageState } from "../lib/projectRepository";

it("exposes labelled storefront/cart controls and persists explicit choices across remount", () => {
  seedApp([createEcommerceFixture()]);
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", {name:"Guided Intake"}));
  fireEvent.click(screen.getByRole("button", {name:/Foundation/}));
  expect(screen.getByRole("textbox", {name:/Storefront model/})).toHaveValue("Single merchant, shared platform, multiple branded storefront contexts");
  fireEvent.click(screen.getByRole("button", {name:/Features/}));
  const input = screen.getByRole("textbox", {name:/Cart scope decision/});
  fireEvent.change(input,{target:{value:"Separate carts per approved storefront context"}});
  expect(loadStorageState().projects[0].intake.ecommerceCartScope).toBe("Separate carts per approved storefront context");
  view.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", {name:"Guided Intake"}));
  fireEvent.click(screen.getByRole("button", {name:/Features/}));
  expect(screen.getByRole("textbox", {name:/Cart scope decision/})).toHaveValue("Separate carts per approved storefront context");
});
