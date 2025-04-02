import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../pages/login';
import { useRouter } from 'next/router';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('Login', () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockRouterPush,
    });
  });

  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('Användarnamn')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Lösenord')).toBeInTheDocument();
    expect(screen.getAllByText('Logga In').length).toBeGreaterThan(0);
  });

  it('shows error message on failed login', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })
    );

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText('Användarnamn'), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByPlaceholderText('Lösenord'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Logga In' }));

    const errorMessage = await screen.findByText('Fel användarnamn eller lösenord!');
    expect(errorMessage).toBeInTheDocument();
  });

  it('redirects to account page on successful login', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ otp: '123456' }),
      })
    );

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText('Användarnamn'), { target: { value: 'correctuser' } });
    fireEvent.change(screen.getByPlaceholderText('Lösenord'), { target: { value: 'correctpassword' } });
    fireEvent.click(screen.getByRole('button', { name: 'Logga In' }));

    await screen.findByText('OTP: 123456');
    expect(mockRouterPush).toHaveBeenCalledWith('/account');
  });
});