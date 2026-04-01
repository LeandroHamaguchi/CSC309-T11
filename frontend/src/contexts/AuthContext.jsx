import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/*
 * This provider should export a `user` context state that is 
 * set (to non-null) when:
 *     1. a hard reload happens while a user is logged in.
 *     2. the user just logged in.
 * `user` should be set to null when:
 *     1. a hard reload happens when no users are logged in.
 *     2. the user just logged out.
 */
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const loginSeqRef = useRef(0);
    const registerSeqRef = useRef(0);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setUser(null);
            return;
        }

        (async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/user/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    localStorage.removeItem("token");
                    setUser(null);
                    return;
                }

                const data = await res.json();
                setUser(data.user);

            } catch {
                localStorage.removeItem("token");
                setUser(null);
            }
        })();
    }, []);

    /*
     * Logout the currently authenticated user.
     *
     * @remarks This function will always navigate to "/".
     */
    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/");
    };

    /**
     * Login a user with their credentials.
     *
     * @remarks Upon success, navigates to "/profile". 
     * @param {string} username - The username of the user.
     * @param {string} password - The password of the user.
     * @returns {string} - Upon failure, Returns an error message.
     */
    const login = async (username, password) => {
        const seq = ++loginSeqRef.current;
        try {
            const res = await fetch(`${BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json().catch(() => ({}));
            if (seq !== loginSeqRef.current) {
                return;
            }

            const token =
                typeof data.token === "string" && data.token.length > 0
                    ? data.token
                    : null;
            if (!res.ok || !token) {
                const msg = data.message || data.error;
                if (msg) return String(msg);
                if (res.status === 401) return "Invalid credentials";
                return "Login failed";
            }

            const meRes = await fetch(`${BACKEND_URL}/user/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const meData = await meRes.json().catch(() => ({}));
            if (seq !== loginSeqRef.current) {
                return;
            }
            if (!meRes.ok) {
                return meData.message || "Could not load profile";
            }

            localStorage.setItem("token", token);
            setUser(meData.user);
            navigate("/profile");
        } catch {
            if (seq !== loginSeqRef.current) {
                return;
            }
            return "Network error";
        }
    };

    /**
     * Registers a new user. 
     * 
     * @remarks Upon success, navigates to "/success".
     * @param {Object} userData - The data of the user to register.
     * @returns {string} - Upon failure, returns an error message.
     */
    const register = async (userData) => {
        const seq = ++registerSeqRef.current;
        try {
            const res = await fetch(`${BACKEND_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });

            const data = await res.json().catch(() => ({}));
            if (seq !== registerSeqRef.current) {
                return;
            }

            if (!res.ok || res.status !== 201) {
                const msg = data.message || data.error;
                if (msg) return String(msg);
                if (res.status === 409) return "User Name already exists";
                if (res.status === 400) return "All fields are required";
                return "Registration failed";
            }
            navigate("/success");
        } catch {
            if (seq !== registerSeqRef.current) {
                return;
            }
            return "Network error";
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
