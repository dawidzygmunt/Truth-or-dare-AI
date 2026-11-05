import { Link } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { topActionClasses } from './button.js';

export function BackLink() {
  return (
    <Link data-testid="back-link" className={`${topActionClasses} w-fit`} to="/">
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-full border border-line-dashed"
      >
        {pl.common.backSymbol}
      </span>
      {pl.common.back}
    </Link>
  );
}
