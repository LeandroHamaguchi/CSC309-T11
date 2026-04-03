import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

        try {
            const res = await fetch(`${BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                return data.message || "Invalid credentials";
            }

            localStorage.setItem("token", data.token);

            const meRes = await fetch(`${BACKEND_URL}/user/me`, {
                headers: { Authorization: `Bearer ${data.token}` },
            });

            if (!meRes.ok) {
                return "Could not load profile";
            }

            const meData = await meRes.json();
            setUser(meData.user);
            navigate("/profile");
        } catch {
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
        try {
            const res = await fetch(`${BACKEND_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                return data.message || "Registration failed";
            }

            navigate("/success");
        } catch {
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
