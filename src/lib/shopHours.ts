export interface OpenStatus {
  isOpen: boolean;
  label: string;
  nextLabel: string;
}

export function getOpenStatus(
  openingHours: { open: string; close: string } | null | undefined
): OpenStatus {
  if (!openingHours || !openingHours.open || !openingHours.close) {
    return { isOpen: false, label: 'Hours not set', nextLabel: '' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = openingHours.open.split(':').map(Number);
  const [closeH, closeM] = openingHours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isOpen) {
    return {
      isOpen: true,
      label: 'Open now',
      nextLabel: `Closes at ${openingHours.close}`,
    };
  }

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      label: 'Closed',
      nextLabel: `Opens at ${openingHours.open}`,
    };
  }

  return {
    isOpen: false,
    label: 'Closed',
    nextLabel: `Opens at ${openingHours.open} tomorrow`,
  };
}
