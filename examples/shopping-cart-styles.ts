import { app, resolveTransport, window, vbox, button, label, styles  } from 'tsyne';

// Define custom CSS classes for your shopping cart UI
styles({
  shopping_cart: {
    color: '#4ec9b0',
    font_size: 16,
    font_weight: 'bold'
  },
  product_name: {
    font_size: 18,
    font_weight: 'bold',
    color: '#d4d4d4'
  },
  price_tag: {
    color: '#ffd700',
    font_size: 14
  },
  // Using Fyne's Importance for semantic styling
  checkout_button: {
    importance: 'success'  // Green/success theme
  },
  remove_button: {
    importance: 'danger'   // Red/error theme
  },
  info_button: {
    importance: 'medium'   // Standard theme
  }
});

// Shopping cart example
app(resolveTransport(), { title: "Shopping Demo" }, () => {
  window({ title: "Shopping Cart" }, () => {
    vbox(() => {
      label("Your Shopping Cart", "product_name");

      // Product items
      label("Premium Widget - $29.99", "price_tag");

      // Action buttons using custom classes
      button("Add to Cart", () => {
        console.log("Added to cart!");
      }, "shopping_cart");

      // Buttons using Fyne's Importance enum values
      button("Checkout", () => {
        console.log("Proceeding to checkout");
      }, "checkout_button");

      button("Remove Item", () => {
        console.log("Item removed");
      }, "remove_button");

      button("View Details", () => {
        console.log("Viewing details");
      }, "info_button");
    });
  });
});
