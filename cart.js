// 1. Initialize the cart counter variable
let cartCount = 0;

// 2. Get the HTML elements we need to interact with
const countElement = document.getElementById('cart-count');
const addButton = document.getElementById('add-button');

// 3. Define the function that adds an item to the cart
function addToCart() {
    // Increment the count by 1
    cartCount = cartCount + 1; 
    // You could also write: cartCount++;

    // Update the text content of the <span> element
    countElement.textContent = cartCount;

    // Optional: Provide feedback to the user
    console.log(`Item added! Total items: ${cartCount}`);
}

// 4. Attach the function to the button's click event
addButton.addEventListener('click', addToCart);