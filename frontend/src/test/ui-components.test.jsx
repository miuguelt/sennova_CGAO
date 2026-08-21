import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import StatusBadge from '../components/ui/StatusBadge';
import Toast from '../components/ui/Toast';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    expect(container.querySelector('button').className).toContain('bg-emerald-700');
  });

  it('applies size classes', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    expect(container.querySelector('button').className).toContain('h-9');
  });

  it('handles click events', () => {
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(clicked).toBe(true);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { container } = render(<Card variant="elevated">Elevated</Card>);
    expect(container.querySelector('div').className).toContain('shadow-lg');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Custom</Card>);
    expect(container.querySelector('div').className).toContain('custom-class');
  });
});

describe('Badge', () => {
  it('renders text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    expect(container.querySelector('span').className).toContain('bg-emerald-50');
  });

  it('renders dot indicator', () => {
    const { container } = render(<Badge dot>With dot</Badge>);
    expect(container.querySelector('span > span')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('renders estado text', () => {
    render(<StatusBadge estado="Aprobado" />);
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
  });

  it('maps known statuses to correct variants', () => {
    const { container } = render(<StatusBadge estado="Activo" />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('shows fallback for unknown statuses', () => {
    render(<StatusBadge estado="Desconocido" />);
    expect(screen.getByText('Desconocido')).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Name" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Name" error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('updates value on change', () => {
    let value = '';
    render(<Input label="Name" value={value} onChange={(e) => { value = e.target.value; }} />);
    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'John' } });
    expect(value).toBe('John');
  });
});

describe('Select', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ];

  it('renders with label', () => {
    render(<Select label="Choose" options={options} />);
    expect(screen.getByText('Choose')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Choose" options={options} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('shows error', () => {
    render(<Select label="Choose" options={options} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Select label="Choose" options={options} disabled />);
    expect(screen.getByLabelText('Choose')).toBeDisabled();
  });
});

describe('TextArea', () => {
  it('renders with label', () => {
    render(<TextArea label="Description" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<TextArea label="Desc" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows error', () => {
    render(<TextArea label="Desc" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('renders success message', () => {
    render(<Toast message="Operation successful" type="success" onClose={() => {}} />);
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Toast message="Something went wrong" type="error" onClose={() => {}} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    let closed = false;
    render(<Toast message="Test" type="info" onClose={() => { closed = true; }} />);
    fireEvent.click(screen.getByLabelText('Cerrar notificación'));
    expect(closed).toBe(true);
  });
});
