import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const addToCart = (article) => {
    setCart(prev => {
      const existing = prev.find(i => i.article.id === article.id);
      if (existing) return prev.map(i => i.article.id === article.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { article, quantity: 1 }];
    });
  };

  const removeFromCart = (articleId) => setCart(prev => prev.filter(i => i.article.id !== articleId));

  const updateQuantity = (articleId, qty) => {
    if (qty <= 0) { removeFromCart(articleId); return; }
    setCart(prev => prev.map(i => i.article.id === articleId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.article.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
