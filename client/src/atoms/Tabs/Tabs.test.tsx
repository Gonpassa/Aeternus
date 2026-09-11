import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs.tsx';
import { Tab } from '../Tab/Tab.tsx';

function renderTabs(value = 'analytic', onChange = vi.fn()) {
  render(
    <Tabs value={value} onChange={onChange} aria-label="Analysis mode">
      <Tab value="analytic" label="Analytic" />
      <Tab value="synthetic" label="Synthetic" />
      <Tab value="associative" label="Associative" />
    </Tabs>,
  );
  return {
    onChange,
    analytic: screen.getByRole('tab', { name: 'Analytic' }),
    synthetic: screen.getByRole('tab', { name: 'Synthetic' }),
    associative: screen.getByRole('tab', { name: 'Associative' }),
  };
}

describe('Tabs', () => {
  it('names the tab list and marks only the selected tab', () => {
    const { analytic, synthetic, associative } = renderTabs();

    expect(screen.getByRole('tablist')).toHaveAccessibleName('Analysis mode');
    expect(analytic).toHaveAttribute('aria-selected', 'true');
    expect(synthetic).toHaveAttribute('aria-selected', 'false');
    expect(associative).toHaveAttribute('aria-selected', 'false');
  });

  it('gives the tab list a single tab stop, on the selected tab', () => {
    const { analytic, synthetic, associative } = renderTabs('synthetic');

    expect(analytic).toHaveAttribute('tabindex', '-1');
    expect(synthetic).toHaveAttribute('tabindex', '0');
    expect(associative).toHaveAttribute('tabindex', '-1');
  });

  it('selects a tab on click', async () => {
    const user = userEvent.setup();
    const { onChange, synthetic } = renderTabs();

    await user.click(synthetic);
    expect(onChange).toHaveBeenCalledWith('synthetic');
  });

  it('moves focus with the arrow keys without selecting', async () => {
    const user = userEvent.setup();
    const { onChange, analytic, synthetic } = renderTabs();

    analytic.focus();
    await user.keyboard('{ArrowRight}');

    expect(synthetic).toHaveFocus();
    expect(synthetic).toHaveAttribute('tabindex', '0');
    expect(analytic).toHaveAttribute('tabindex', '-1');
    expect(analytic).toHaveAttribute('aria-selected', 'true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('wraps around at both ends', async () => {
    const user = userEvent.setup();
    const { analytic, associative } = renderTabs();

    analytic.focus();
    await user.keyboard('{ArrowLeft}');
    expect(associative).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(analytic).toHaveFocus();
  });

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup();
    const { analytic, synthetic, associative } = renderTabs('synthetic');

    synthetic.focus();
    await user.keyboard('{End}');
    expect(associative).toHaveFocus();

    await user.keyboard('{Home}');
    expect(analytic).toHaveFocus();
  });

  it('selects the focused tab with Enter', async () => {
    const user = userEvent.setup();
    const { onChange, analytic } = renderTabs();

    analytic.focus();
    await user.keyboard('{ArrowRight}{Enter}');

    expect(onChange).toHaveBeenCalledWith('synthetic');
  });

  it('selects the focused tab with Space', async () => {
    const user = userEvent.setup();
    const { onChange, analytic } = renderTabs();

    analytic.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}[Space]');

    expect(onChange).toHaveBeenCalledWith('associative');
  });

  it('keeps the tab stop on the focused tab when the caller declines the change', async () => {
    const user = userEvent.setup();
    const { analytic, synthetic } = renderTabs();

    analytic.focus();
    await user.keyboard('{ArrowRight}{Enter}');

    // `value` is controlled and this harness never changes it, so "analytic" stays
    // selected. The tab stop still belongs to the tab the user is standing on, or Tab
    // would take them somewhere other than where focus already is.
    expect(synthetic).toHaveFocus();
    expect(synthetic).toHaveAttribute('tabindex', '0');
    expect(analytic).toHaveAttribute('tabindex', '-1');
  });

  it('returns the tab stop to the selection once focus leaves the list', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Tabs value="analytic" onChange={vi.fn()} aria-label="Analysis mode">
          <Tab value="analytic" label="Analytic" />
          <Tab value="synthetic" label="Synthetic" />
        </Tabs>
        <button type="button">Elsewhere</button>
      </>,
    );
    const analytic = screen.getByRole('tab', { name: 'Analytic' });
    const synthetic = screen.getByRole('tab', { name: 'Synthetic' });

    analytic.focus();
    await user.keyboard('{ArrowRight}');
    expect(synthetic).toHaveAttribute('tabindex', '0');

    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(analytic).toHaveAttribute('tabindex', '0');
    expect(synthetic).toHaveAttribute('tabindex', '-1');
  });

  it('ignores keys it does not handle', async () => {
    const user = userEvent.setup();
    const { onChange, analytic } = renderTabs();

    analytic.focus();
    await user.keyboard('{ArrowDown}');

    expect(analytic).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });
});
