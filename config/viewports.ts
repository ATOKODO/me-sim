/** CSS pixel sizes shared by Storybook and browser screenshot tests. */
export const REFERENCE_VIEWPORTS = {
  iphone16pro: {
    name: "iPhone 16 Pro",
    width: 402,
    height: 874,
    type: "mobile",
  },
  ipadpro11: { name: "iPad Pro 11″", width: 834, height: 1194, type: "tablet" },
  macbookpro14: {
    name: "MacBook Pro 14″",
    width: 1512,
    height: 982,
    type: "desktop",
  },
  desktop: { name: "Desktop", width: 1920, height: 1080, type: "desktop" },
} as const;
