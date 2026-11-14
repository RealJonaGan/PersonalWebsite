// 1. Initialize cart count from localStorage (or default to 0 if none saved)
let cartCount = parseInt(localStorage.getItem('cart_count')) || 0;

// 2. Get HTML elements safely
const countElement = document.getElementById('cart-count');
const addButton = document.getElementById('add-button');

// 3. Set the initial display value on page load
if (countElement) {
    countElement.textContent = cartCount;
}

// 4. Define the function that adds an item to the cart
function addToCart(event) {
    // Prevent default behavior if it's inside a form or link
    if (event) event.preventDefault();

    // Increment the count
    cartCount++; 

    // Update the UI text safely
    if (countElement) {
        countElement.textContent = cartCount;
    }

    // Persist to localStorage so it survives page refreshes
    localStorage.setItem('cart_count', cartCount);

    // Provide feedback
    console.log(`Item added! Total items: ${cartCount}`);
}

// 5. Attach listener safely (checks if the button actually exists on the page)
if (addButton) {
    addButton.addEventListener('click', addToCart);
} else {
    console.warn('Warning: #add-button element not found on this page.');
}