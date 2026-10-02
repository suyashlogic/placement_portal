import { useState, useEffect } from 'react';
import { AuthContext } from './authContext';
import * as authService from '../services/authService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until we know the login state

  // Restore the session when the app first loads
  useEffect(() => {
    authService
      .getMe()
      .then(setUser)
      .catch(() => setUser(null)) // a 401 here just means "not logged in"
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser); // state change → every component using useAuth re-renders
    return loggedInUser;
  };

  const register = async (formData) => {
    const newUser = await authService.register(formData);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}