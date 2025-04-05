/**
 * THREE.js Wrapper
 * Provides access to the global THREE object
 */

// Make sure THREE is available globally
if (!window.THREE) {
  console.error(
    "THREE.js is not loaded. Make sure to include the script tag in your HTML file."
  );
}

// Export the global THREE object
export default window.THREE;
