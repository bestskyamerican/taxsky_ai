import { calculateCalifornia } from "./californiaEngine.js";
// Add imports for other states here.

export function calculateStateTax(session, state) {
  switch (state.toUpperCase()) {
    case "CA":
      return calculateCalifornia(session);
    // Add more cases as necessary.
    default:
      return {
        state,
        supported: false,
        refund: 0,
        taxDue: 0,
        message: `State ${state} is not supported.`,
      };
  }
}