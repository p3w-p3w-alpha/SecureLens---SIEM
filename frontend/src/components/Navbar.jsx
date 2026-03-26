import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-lg font-semibold">
        SecureLens
      </Link>
      <div className="flex gap-4">
        <Link to="/" className="hover:text-gray-300">Home</Link>
        <Link to="/login" className="hover:text-gray-300">Login</Link>
        <Link to="/register" className="hover:text-gray-300">Register</Link>
      </div>
    </nav>
  );
}
