const AGE_CONFIRMED_KEY = 'tod.age-confirmed';

// localStorage throws when site data is blocked; the gate then simply asks again next launch.
export function isAgeConfirmed(): boolean {
  try {
    return localStorage.getItem(AGE_CONFIRMED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function rememberAgeConfirmed(): void {
  try {
    localStorage.setItem(AGE_CONFIRMED_KEY, 'true');
  } catch {
    // The confirmation still holds for this session.
  }
}
