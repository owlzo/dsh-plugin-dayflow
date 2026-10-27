/**
 * The scripted tour every demo capture follows.
 *
 * Kept in one module so the still frames and the GIF show the same states, and
 * so a layout change only needs one edit. Each step ends on a settled frame:
 * the recorder samples video continuously, and a half-finished transition would
 * show up as a blur in the GIF.
 * @module scripts/demo/tour
 */

/**
 * The demo's viewport, in CSS pixels. The height is deliberately shorter than a
 * full window: the month calendar needs about 540px, and a taller frame would
 * leave a band of empty pane under the legend.
 */
export const VIEWPORT = { width: 1000, height: 570 };

/** The day the tour opens: the busiest day of the recorded week. */
export const TOUR_DAY = '2026-10-21';

/** That day's column in the Monday-first week view. */
export const TOUR_DAY_INDEX = 2;

/**
 * Wait for the panel to paint data rather than its loading state.
 * @param page - the page.
 */
export async function settled(page) {
  await page.waitForFunction(
    () => document.querySelector('.dfp-grid, .dfp-week-grid') !== null,
    undefined,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(350);
}

/**
 * Move the pointer onto an element, in steps, so hover-in is not a jump.
 * @param page - the page.
 * @param box - the target rectangle.
 * @param offset - the point inside it, as a fraction of width and height.
 */
export async function hoverBox(page, box, offset = { x: 0.5, y: 0.5 }) {
  await page.mouse.move(box.x + box.width * offset.x, box.y + box.height * offset.y, { steps: 8 });
}

/**
 * Park the pointer far from any hover target and let the card unmount.
 * @param page - the page.
 * @param ms - how long to wait afterwards.
 */
export async function park(page, ms = 260) {
  await page.mouse.move(4, 4, { steps: 4 });
  await page.waitForTimeout(ms);
}

/**
 * Click the day view's week/month switch and wait for the lanes to lay out.
 * @param page - the page.
 * @param view - `month` or `week`.
 */
export async function switchView(page, view) {
  await page.locator(`#dayflow-view-${view}`).click();
  await settled(page);
}

/**
 * Scroll the week pane so the busy part of the day fills the viewport.
 * The axis follows the data, so this only decides where the viewport sits.
 * @param page - the page.
 * @param hour - the hour to bring near the top.
 */
export async function scrollWeekTo(page, hour) {
  await page.evaluate((target) => {
    const pane = document.querySelector('.dfp-week-scroll');
    if (pane === null) return;
    const hourOf = (text) => {
      const trimmed = text.trim();
      if (trimmed.includes(':')) return Number(trimmed.split(':')[0]);
      const match = /^(\d{1,2})\s*(AM|PM)$/i.exec(trimmed);
      if (match === null) return -1;
      const twelve = Number(match[1]) % 12;
      return match[2].toUpperCase() === 'PM' ? twelve + 12 : twelve;
    };
    const label = [...pane.querySelectorAll('.dfp-week-hour')].find((node) => hourOf(node.textContent ?? '') === target);
    if (label === undefined) return;
    pane.scrollTop += label.getBoundingClientRect().top - pane.getBoundingClientRect().top - 40;
  }, hour);
  await page.waitForTimeout(320);
}

/**
 * Zoom the week axis with the header's +/− controls.
 * @param page - the page.
 * @param times - how many clicks.
 */
export async function zoomWeek(page, times) {
  const selector = times > 0 ? '[aria-label="Zoom the time axis in"]' : '[aria-label="Zoom the time axis out"]';
  for (let index = 0; index < Math.abs(times); index += 1) {
    await page.locator(selector).click();
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(260);
}

/**
 * The month grid cell for one day. The panel labels each cell with a localized
 * short date, so the expected prefix is formatted in the page's own locale
 * rather than hard-coded here.
 * @param page - the page.
 * @param dayKey - the day to find.
 * @returns the locator for that cell.
 */
async function monthCell(page, dayKey) {
  const prefix = await page.evaluate((key) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    const language = document.documentElement.lang || 'en';
    return new Intl.DateTimeFormat(language, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  }, dayKey);
  return page.locator(`.dfp-cell[aria-label^="${prefix}"]`).first();
}

/**
 * The month calendar, with one day's hover card open.
 * @param page - the page.
 */
export async function monthWithHover(page) {
  const cell = await monthCell(page, TOUR_DAY);
  const box = await cell.boundingBox();
  if (box === null) throw new Error('the month grid did not render a cell for the tour day');
  await hoverBox(page, box);
  await page.waitForSelector('.dfp-hovercard', { timeout: 5_000 });
  await page.waitForTimeout(700);
}

/**
 * The week swim lanes, scrolled to the working day, with one card's hover card.
 * @param page - the page.
 * @param avoid - substrings that disqualify a card as the hover target: the idle
 * block is the tallest card of the day but says nothing worth recording.
 */
export async function weekWithHover(page, avoid = []) {
  // The axis starts at the week's first card — 1 AM here, because one card
  // landed after midnight — so scroll to the working day as soon as the lanes
  // exist, rather than letting the recording sit on empty night.
  await page.locator('#dayflow-view-week').click();
  await page.waitForSelector('.dfp-week-card', { timeout: 15_000 });
  await scrollWeekTo(page, 10);

  // Hover the roomiest card of the tour day that is fully inside the pane: a
  // card clipped by the viewport edge would anchor its hover card off-screen.
  const box = await page.evaluate(
    ({ dayIndex, avoid: skip }) => {
      const pane = document.querySelector('.dfp-week-scroll');
      if (pane === null) return null;
      const paneBox = pane.getBoundingClientRect();
      const column = [...pane.querySelectorAll('.dfp-week-col')][dayIndex];
      const candidates = [...(column?.querySelectorAll('.dfp-week-card') ?? [])]
        // A card with a summary reads better in the hover card than a one-liner.
        .filter((node) => node.querySelector('.dfp-week-card-summary') !== null)
        .filter((node) => !skip.some((text) => (node.textContent ?? '').startsWith(text)))
        .map((node) => node.getBoundingClientRect())
        .filter((rect) => rect.top >= paneBox.top + 8 && rect.bottom <= paneBox.bottom - 8 && rect.width > 90)
        .sort((left, right) => right.height - left.height || right.width - left.width);
      const best = candidates[0];
      return best === undefined ? null : { x: best.x, y: best.y, width: best.width, height: best.height };
    },
    { dayIndex: TOUR_DAY_INDEX, avoid },
  );
  if (box === null) throw new Error('the week lanes rendered no card inside the pane');

  await hoverBox(page, box, { x: 0.5, y: 0.25 });
  await page.waitForSelector('.dfp-hovercard', { timeout: 5_000 });
  await page.waitForTimeout(700);
}

/**
 * One day in full, opened from the week lanes.
 * @param page - the page.
 */
export async function dayDetail(page) {
  await page.locator('.dfp-hovercard').waitFor({ state: 'detached', timeout: 5_000 }).catch(() => {});
  const card = page.locator('.dfp-week-card').filter({ hasNot: page.locator('.dfp-hovercard') }).first();
  const visible = await page.evaluate((dayIndex) => {
    const pane = document.querySelector('.dfp-week-scroll');
    if (pane === null) return null;
    const paneBox = pane.getBoundingClientRect();
    const column = [...pane.querySelectorAll('.dfp-week-col')][dayIndex];
    const node = [...(column?.querySelectorAll('.dfp-week-card') ?? [])].find((entry) => {
      const rect = entry.getBoundingClientRect();
      return rect.top >= paneBox.top + 8 && rect.bottom <= paneBox.bottom - 8;
    });
    if (node === undefined) return null;
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, TOUR_DAY_INDEX);
  if (visible === null) throw new Error('no week card to open');
  await page.mouse.click(visible.x + visible.width / 2, visible.y + visible.height / 2);
  await page.waitForSelector('.dfp-events', { timeout: 5_000 });
  await page.waitForTimeout(900);
}
