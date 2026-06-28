import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { login, register, getItems, createItem } from './api';
import { FiLogIn, FiLogOut, FiPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { clsx } from 'clsx';

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [period, setPeriod] = useState('week');
  const [newUserModal, setNewUserModal] = useState(false);
  const { register: registerForm, handleSubmit, reset } = useForm();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (data) => {
    try {
      const response = await login(data);
      if (response.success) {
        localStorage.setItem('token', response.token);
        setIsLoggedIn(true);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRegister = async (data) => {
    try {
      const response = await register(data);
      if (response.success) {
        localStorage.setItem('token', response.token);
        setIsLoggedIn(true);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    navigate('/');
  };

  const fetchItems = async () => {
    try {
      const response = await getItems();
      const safeList = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      setItems(safeList);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getItems('users');
      const safeList = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      setUsers(safeList);
      setTotalUsers(safeList.length);
      setActiveSessions(safeList.filter((user) => user.status === 'active').length);
      setRevenue(safeList.reduce((acc, user) => acc + user.revenue, 0));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchItems();
      fetchUsers();
    }
  }, [isLoggedIn]);

  const handleCreateUser = async (data) => {
    try {
      const response = await createItem('users', data);
      if (response.success) {
        fetchUsers();
        reset();
        setNewUserModal(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="app-wrapper">
      <ToastContainer />
      <div className="min-h-screen bg-gray-900 text-white">
        {isLoggedIn ? (
          <div>
            <header className="bg-gray-800 py-4">
              <nav className="container mx-auto flex justify-between">
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 py-2 px-4 rounded">
                  <FiLogOut size={20} /> Logout
                </button>
              </nav>
            </header>
            <main className="container mx-auto p-4 pt-6 pb-6 md:p-6 lg:p-12 xl:p-24">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded">
                  <h2 className="text-lg font-bold">Total Users</h2>
                  <p className="text-3xl">{totalUsers}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded">
                  <h2 className="text-lg font-bold">Active Sessions</h2>
                  <p className="text-3xl">{activeSessions}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded">
                  <h2 className="text-lg font-bold">Revenue</h2>
                  <p className="text-3xl">${revenue}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded">
                  <h2 className="text-lg font-bold">Growth</h2>
                  <p className="text-3xl">10%</p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded mb-6">
                <h2 className="text-lg font-bold">Monthly Growth</h2>
                <div className="h-64">
                  <div className="bg-gray-600 h-full relative">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="bg-blue-500 absolute bottom-0"
                        style={{
                          width: '100%',
                          height: `${(item.value / 100) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded mb-6">
                <h2 className="text-lg font-bold">Recent Sign-ups</h2>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Plan Type</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{user.name}</td>
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2">
                          {user.planType === 'free' ? (
                            <span className="bg-green-500 text-white py-1 px-2 rounded">
                              Free
                            </span>
                          ) : (
                            <span className="bg-orange-500 text-white py-1 px-2 rounded">
                              Pro
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {user.status === 'active' ? (
                            <span className="bg-green-500 text-white py-1 px-2 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="bg-red-500 text-white py-1 px-2 rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setNewUserModal(true)}
                className="bg-green-500 hover:bg-green-700 py-2 px-4 rounded"
              >
                <FiPlus size={20} /> Add User
              </button>
            </main>
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <div className="container mx-auto p-4 pt-6 pb-6 md:p-6 lg:p-12 xl:p-24">
                  <h1 className="text-2xl font-bold">Login</h1>
                  <form onSubmit={handleSubmit(handleLogin)}>
                    <div className="mb-4">
                      <label className="block text-gray-300">Email</label>
                      <input
                        type="email"
                        {...registerForm('email')}
                        className="block w-full p-2 rounded"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-300">Password</label>
                      <input
                        type="password"
                        {...registerForm('password')}
                        className="block w-full p-2 rounded"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-700 py-2 px-4 rounded"
                    >
                      <FiLogIn size={20} /> Login
                    </button>
                  </form>
                </div>
              }
            />
            <Route
              path="/register"
              element={
                <div className="container mx-auto p-4 pt-6 pb-6 md:p-6 lg:p-12 xl:p-24">
                  <h1 className="text-2xl font-bold">Register</h1>
                  <form onSubmit={handleSubmit(handleRegister)}>
                    <div className="mb-4">
                      <label className="block text-gray-300">Name</label>
                      <input
                        type="text"
                        {...registerForm('name')}
                        className="block w-full p-2 rounded"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-300">Email</label>
                      <input
                        type="email"
                        {...registerForm('email')}
                        className="block w-full p-2 rounded"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-300">Password</label>
                      <input
                        type="password"
                        {...registerForm('password')}
                        className="block w-full p-2 rounded"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-700 py-2 px-4 rounded"
                    >
                      <FiLogIn size={20} /> Register
                    </button>
                  </form>
                </div>
              }
            />
          </Routes>
        )}
        {newUserModal && (
          <div
            className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-50 flex justify-center items-center"
            onClick={() => setNewUserModal(false)}
          >
            <div
              className="bg-gray-700 p-4 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold">Add User</h2>
              <form onSubmit={handleSubmit(handleCreateUser)}>
                <div className="mb-4">
                  <label className="block text-gray-300">Name</label>
                  <input
                    type="text"
                    {...registerForm('name')}
                    className="block w-full p-2 rounded"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300">Email</label>
                  <input
                    type="email"
                    {...registerForm('email')}
                    className="block w-full p-2 rounded"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300">Plan Type</label>
                  <select
                    {...registerForm('planType')}
                    className="block w-full p-2 rounded"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 py-2 px-4 rounded"
                >
                  <FiPlus size={20} /> Add User
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;