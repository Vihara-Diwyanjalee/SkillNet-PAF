import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { 
  User as AuthUser, 
  getCurrentUser, 
  initiateOAuthLogin, 
  login as regularLogin,
  logout as authLogout 
} from '../services/api/auth';

// Types
export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  skills?: string[];
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  login: (provider: 'google' | 'github') => void;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: {
    name: string;
    bio: string;
    profilePicture: File | null;
    skills: string[];
  }) => Promise<void>;
  handleAuthCallback: (token: string, userId?: string) => Promise<void>; // Added handleAuthCallback
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock OAuth implementation
const mockOAuthLogin = async (provider: 'google' | 'facebook'): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    id: '1',
    name: 'Alex Johnson',
    username: 'alexj',
    email: 'alex@example.com',
    profilePicture: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
    bio: 'Science enthusiast and math teacher passionate about helping others learn!',
    skills: ['Maths', 'Science']
  };
};

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to load the current user
  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      
      if (userData) {
        console.log("User data loaded:", userData);
        setUser(userData);
        localStorage.setItem('skillnet_user', JSON.stringify({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          username: userData.username || userData.email.split('@')[0],
          profilePictureUrl: userData.profilePictureUrl
        }));
      } else {
        console.log("No user data found from API");
        const storedUser = localStorage.getItem('skillnet_user');
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            console.log("Using stored user data from localStorage:", parsedUser.id);
            setUser(parsedUser as AuthUser);
          } catch (error) {
            console.error("Error parsing stored user data:", error);
            if (token) {
              console.log("Token found, creating temp user");
              setUser({
                id: userId || 'temp-id',
                name: 'User',
                email: 'user@example.com',
                username: userId || 'user'
              });
            } else {
              setUser(null);
            }
          }
        } else if (token) {
          console.log("Token found, creating temp user");
          setUser({
            id: userId || 'temp-id',
            name: 'User',
            email: 'user@example.com',
            username: userId || 'user'
          });
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Error loading user:", error);
      const storedUser = localStorage.getItem('skillnet_user');
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log("Using stored user data after API error:", parsedUser.id);
          setUser(parsedUser as AuthUser);
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          if (token) {
            console.log("API error but token found, creating temp user");
            setUser({
              id: userId || 'temp-id',
              name: 'User',
              email: 'user@example.com',
              username: userId || 'user'
            });
          } else {
            setUser(null);
          }
        }
      } else if (token) {
        console.log("API error but token found, creating temp user");
        setUser({
          id: userId || 'temp-id',
          name: 'User',
          email: 'user@example.com',
          username: userId || 'user'
        });
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Regular login with email and password
  const loginWithCredentials = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await regularLogin(email, password);
      
      if (result.success && result.user) {
        setUser(result.user);
        console.log("Regular login successful, user set:", result.user);
        localStorage.setItem('skillnet_user', JSON.stringify({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          username: result.user.username || result.user.email.split('@')[0],
          profilePictureUrl: result.user.profilePictureUrl
        }));
        console.log("User data stored in localStorage during login:", result.user.id);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Error during regular login:", error);
      return { success: false, error: "Login failed" };
    } finally {
      setLoading(false);
    }
  };

  const handleAuthCallback = async (token: string, userId?: string) => {
    try {
      console.log("Token received in handleAuthCallback:", token ? "Valid token" : "No token");
      console.log("User ID received in handleAuthCallback:", userId || "No user ID");
      
      localStorage.setItem('token', token);
      
      if (userId) {
        localStorage.setItem('userId', userId);
        console.log("User ID saved to localStorage:", userId);
        localStorage.setItem('skillnet_user', JSON.stringify({
          id: userId,
          name: userId,
          email: `${userId.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          username: userId.toLowerCase().replace(/\s+/g, '.'),
        }));
      }
      
      if (!user) {
        setUser({
          id: userId || 'temp-id',
          name: userId || 'Loading...',
          email: userId ? `${userId.toLowerCase().replace(/\s+/g, '.')}@example.com` : 'loading@example.com',
          username: userId ? userId.toLowerCase().replace(/\s+/g, '.') : 'Loading...'
        });
      }
      
      console.log("Attempting to load user profile with token");
      const userData = await getCurrentUser();
      console.log("User profile loaded:", userData ? "Success" : "Failed");
      
      if (userData) {
        setUser(userData);
        localStorage.setItem('userId', userData.id);
        localStorage.setItem('skillnet_user', JSON.stringify({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          username: userData.username || userData.email.split('@')[0],
          profilePictureUrl: userData.profilePictureUrl
        }));
        console.log("User data stored in localStorage:", userData.id);
      } else if (userId) {
        console.log("No user data from API, but using userId from params");
        const userObj = {
          id: userId,
          name: userId,
          email: `${userId.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          username: userId.toLowerCase().replace(/\s+/g, '.'),
        };
        setUser(userObj as AuthUser);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in handleAuthCallback:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log("Token found at startup, loading user");
      loadUser();
    } else {
      console.log("No token found at startup");
      setLoading(false);
    }
    
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data && event.data.type === 'oauth_callback') {
        const { token, userId, error } = event.data;
        if (token) {
          handleAuthCallback(token, userId);
        } else if (error) {
          console.error('OAuth error:', error);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const login = (provider: 'google' | 'github') => {
    initiateOAuthLogin(provider);
  };

  const logout = () => {
    console.log("Logging out user");
    authLogout();
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('skillnet_user');
    setUser(null);
  };

  const updateProfile = async (data: {
    name: string;
    bio: string;
    profilePicture: File | null;
    skills: string[];
  }) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedUser = {
        ...user!,
        name: data.name,
        bio: data.bio,
        skills: data.skills,
        profilePicture: data.profilePicture 
          ? URL.createObjectURL(data.profilePicture)
          : user?.profilePicture
      };
      setUser(updatedUser);
      localStorage.setItem('skillnet_user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    loginWithCredentials, // Added missing loginWithCredentials
    logout,
    updateProfile,
    handleAuthCallback // Added handleAuthCallback
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
