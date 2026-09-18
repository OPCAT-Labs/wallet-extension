import { render } from '@testing-library/react';

import { BaseView } from './index';

// BaseView forwards data attributes through an explicit allow-list rather than a prop spread, so
// an attribute added to a caller is silently dropped unless it is listed here too. That is how the
// CAT20 card's data-token-id went missing.
describe('BaseView data attributes', () => {
  it('forwards every attribute its props declare', () => {
    const { container } = render(
      <BaseView
        testid="thing"
        data-address="addr"
        data-token-symbol="sym"
        data-token-name="name"
        data-token-id="id_0"
        data-collection-name="coll"
        data-collection-id="coll_0"
        data-local-id="local_0"
      />
    );

    const el = container.querySelector('[data-testid="thing"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-address')).toBe('addr');
    expect(el?.getAttribute('data-token-symbol')).toBe('sym');
    expect(el?.getAttribute('data-token-name')).toBe('name');
    expect(el?.getAttribute('data-token-id')).toBe('id_0');
    expect(el?.getAttribute('data-collection-name')).toBe('coll');
    expect(el?.getAttribute('data-collection-id')).toBe('coll_0');
    expect(el?.getAttribute('data-local-id')).toBe('local_0');
  });

  it('omits the attributes that were not passed', () => {
    const { container } = render(<BaseView testid="bare" />);
    const el = container.querySelector('[data-testid="bare"]');
    expect(el?.hasAttribute('data-token-id')).toBe(false);
  });
});
