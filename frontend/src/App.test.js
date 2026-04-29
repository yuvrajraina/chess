import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login screen when logged out', () => {
  localStorage.clear();

  render(<App />);

  expect(screen.getByRole('heading', { name: /chess arena/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/your username/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/your password/i)).toBeInTheDocument();
});
