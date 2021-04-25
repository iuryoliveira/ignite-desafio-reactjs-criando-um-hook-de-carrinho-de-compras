import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`stock/${productId}`);
      const { amount } = stockResponse.data;

      if(amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const index = cart.findIndex(product => product.id === productId);
        let updatedCart = cart;

        //produto já está no carrinho
        if(index > -1) {
          await updateProductAmount({
            productId,
            amount: updatedCart[index].amount + 1
          });
        } else { //novo produto sendo adicionado ao carrinho
          const productResponse = await api.get(`/products/${productId}`);
          let newProduct = {
            ...productResponse.data,
            amount: 1
          };
          updatedCart = [...cart, newProduct];
          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter(product => product.id !== productId);
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockResponse = await api.get(`stock/${productId}`);
      const amountInStock = stockResponse.data.amount;

      if (amountInStock <= 0) {
        return;
      } else if (amount > amountInStock) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const updatedCart = cart.map(cartProduct => {
          if (cartProduct.id === productId) {
            return {
              ...cartProduct,
              amount,
            }
          } 
          return cartProduct;
        });
        
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
