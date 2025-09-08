import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Users header', () => {
  render(<App />);
  expect(screen.getByText(/Users/i)).toBeInTheDocument();
});
