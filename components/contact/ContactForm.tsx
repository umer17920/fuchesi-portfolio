'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Field, inputClass } from '@/components/primitives/Field';
import { SlotPicker } from '@/components/contact/SlotPicker';
import { bookingSchema, contactSchema, serviceOptions } from '@/lib/contact-schema';
import { site } from '@/lib/site';

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'notConfigured';
type Mode = 'message' | 'meeting';

const EMPTY = {
  name: '',
  email: '',
  company: '',
  serviceInterest: '', // doubles as "topic" in meeting mode
  message: '',
  preferredDate: '',
  /** Absolute ISO instant of the chosen slot — never a wall-clock string. */
  slotStart: '',
  website: '', // honeypot
};

/**
 * The visitor's IANA timezone, read from the browser.
 *
 * Resolved lazily rather than at module scope: this component pre-renders on
 * the server, where the "browser timezone" would be the build machine's.
 */
function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function ContactForm() {
  const [mode, setMode] = useState<Mode>('message');
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [visitorTimeZone, setVisitorTimeZone] = useState('');
  const [window_, setWindow] = useState<{ minDate: string; maxDate: string } | null>(null);
  const [slotRefresh, setSlotRefresh] = useState(0);
  const [slotTaken, setSlotTaken] = useState(false);
  const [outcome, setOutcome] = useState<{ requiresConfirmation: boolean; ourTime?: string } | null>(
    null,
  );

  useEffect(() => setVisitorTimeZone(resolveTimeZone()), []);

  // Fetch the bookable window once the visitor shows interest, so the date
  // input cannot offer days the server would reject anyway.
  useEffect(() => {
    if (mode !== 'meeting' || window_) return;
    let cancelled = false;
    fetch('/api/availability', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { minDate?: string; maxDate?: string }) => {
        if (cancelled || !data.minDate || !data.maxDate) return;
        setWindow({ minDate: data.minDate, maxDate: data.maxDate });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [mode, window_]);

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setErrors({});
    setStatus('idle');
    setSlotTaken(false);
    // Keep name/email/company; clear the mode-specific fields.
    setValues((v) => ({ ...v, message: '', preferredDate: '', slotStart: '' }));
  };

  /** Picking a different date invalidates the chosen time. */
  const onDateChange = (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, preferredDate: e.target.value, slotStart: '' }));
    setErrors((prev) => ({ ...prev, preferredDate: '', slotStart: '' }));
    setSlotTaken(false);
  };

  const onSlotChange = (startIso: string) => {
    setValues((v) => ({ ...v, slotStart: startIso }));
    setErrors((prev) => (prev.slotStart ? { ...prev, slotStart: '' } : prev));
    setSlotTaken(false);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build the payload and pick the validator for the active mode. The dropdown
    // value maps to `serviceInterest` for a message and `topic` for a meeting.
    const payload =
      mode === 'message'
        ? {
            name: values.name,
            email: values.email,
            company: values.company,
            serviceInterest: values.serviceInterest,
            message: values.message,
            website: values.website,
          }
        : {
            name: values.name,
            email: values.email,
            company: values.company,
            topic: values.serviceInterest,
            slotStart: values.slotStart,
            visitorTimeZone: visitorTimeZone || resolveTimeZone(),
            message: values.message,
            website: values.website,
          };

    const schema = mode === 'message' ? contactSchema : bookingSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? '']),
      );
      // The schema field "topic" maps back to the shared serviceInterest input.
      if (fieldErrors.topic) fieldErrors.serviceInterest = fieldErrors.topic;
      setErrors(fieldErrors);
      const firstKey = Object.keys(fieldErrors)[0];
      if (firstKey) document.getElementById(`field-${firstKey}`)?.focus();
      return;
    }

    setErrors({});
    setStatus('submitting');

    try {
      const res = await fetch(mode === 'message' ? '/api/contact' : '/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setOutcome({
          requiresConfirmation: Boolean(data.requiresConfirmation),
          ourTime: data.ourTime,
        });
        setStatus('success');
        setValues(EMPTY);
        return;
      }

      const data = await res.json().catch(() => ({}));

      // Lost the race: somebody claimed this slot between the grid loading and
      // this submit. Repaint the board rather than showing an error — the tile
      // simply greys out, which is the honest picture of what happened.
      if (res.status === 409 && data.error === 'slotTaken') {
        setValues((v) => ({ ...v, slotStart: '' }));
        setSlotTaken(true);
        setSlotRefresh((n) => n + 1);
        setStatus('idle');
        document.getElementById('field-slotStart')?.scrollIntoView({ block: 'center' });
        return;
      }

      if (data.fieldErrors) {
        const fe = { ...data.fieldErrors };
        if (fe.topic) fe.serviceInterest = fe.topic;
        setErrors(fe);
        setStatus('idle');
        return;
      }
      setStatus(data.error === 'notConfigured' ? 'notConfigured' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    const heading =
      mode !== 'meeting'
        ? 'Message sent.'
        : outcome?.requiresConfirmation
          ? 'Check your email.'
          : 'Meeting booked.';

    const detail =
      mode !== 'meeting'
        ? 'We read everything that comes in and reply within one working day. If it is urgent, WhatsApp us on '
        : outcome?.requiresConfirmation
          ? 'We are holding that time for you. Click the link in the email we just sent to lock it in, or the slot reopens automatically. If it is urgent, WhatsApp us on '
          : 'It is in the diary and we have emailed you the details. If it is urgent, WhatsApp us on ';

    return (
      <div role="status" className="rounded-lg border border-hairline bg-paper-raised p-8">
        <h2 className="font-display text-display-s">{heading}</h2>
        <p className="mt-4 max-w-[52ch] text-body-m text-muted">
          {detail}
          {site.contact.whatsappDisplay}.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setOutcome(null);
          }}
          className="mt-6 border-b border-hairline pb-1 text-body-s transition-colors duration-300 hover:border-ink"
        >
          {mode === 'meeting' ? 'Book another' : 'Send another'}
        </button>
      </div>
    );
  }

  const meeting = mode === 'meeting';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Mode toggle. A real radiogroup so it is keyboard- and screen-reader-
          navigable, not just two styled buttons. */}
      <div
        role="radiogroup"
        aria-label="What would you like to do?"
        className="inline-flex rounded-full border border-hairline p-1"
      >
        {(
          [
            ['message', 'Send a message'],
            ['meeting', 'Request a meeting'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => switchMode(value)}
            className={`rounded-full px-4 py-2 text-body-s transition-colors duration-200 ${
              mode === value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" name="name" error={errors.name}>
          {(p) => (
            <input
              {...p}
              name="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={set('name')}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Email" name="email" error={errors.email}>
          {(p) => (
            <input
              {...p}
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={set('email')}
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <Field label="Company" name="company" error={errors.company} optional>
        {(p) => (
          <input
            {...p}
            name="company"
            type="text"
            autoComplete="organization"
            value={values.company}
            onChange={set('company')}
            className={inputClass}
          />
        )}
      </Field>

      <Field
        label={meeting ? 'What is the meeting about?' : 'What is this about?'}
        name="serviceInterest"
        error={errors.serviceInterest}
      >
        {(p) => (
          <select
            {...p}
            name="serviceInterest"
            value={values.serviceInterest}
            onChange={set('serviceInterest')}
            className={inputClass}
          >
            <option value="">Choose one</option>
            {serviceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      {meeting && (
        <div className="space-y-6">
          <div className="sm:max-w-xs">
            <Field label="Pick a date" name="preferredDate" error={errors.preferredDate}>
              {(p) => (
                <input
                  {...p}
                  name="preferredDate"
                  type="date"
                  min={window_?.minDate}
                  max={window_?.maxDate}
                  value={values.preferredDate}
                  onChange={onDateChange}
                  className={inputClass}
                />
              )}
            </Field>
          </div>

          <Field label="Pick a time" name="slotStart" error={errors.slotStart}>
            {(p) => (
              <div id={p.id} tabIndex={-1}>
                <SlotPicker
                  date={values.preferredDate}
                  value={values.slotStart}
                  onChange={onSlotChange}
                  visitorTimeZone={visitorTimeZone}
                  refreshKey={slotRefresh}
                  describedBy={p['aria-describedby']}
                  invalid={p['aria-invalid']}
                />
              </div>
            )}
          </Field>

          {slotTaken && (
            <p
              role="status"
              className="rounded-lg border border-hairline bg-paper-raised px-4 py-3 text-body-s"
            >
              That time was taken while you were filling this in, so it is greyed out now. Pick another
              and you are done.
            </p>
          )}
        </div>
      )}

      <Field
        label={meeting ? 'Anything we should know?' : 'What is not working?'}
        name="message"
        error={errors.message}
        optional={meeting}
      >
        {(p) => (
          <textarea
            {...p}
            name="message"
            rows={meeting ? 3 : 6}
            value={values.message}
            onChange={set('message')}
            placeholder={
              meeting
                ? 'A line on what you would like to cover. Optional.'
                : 'Describe the problem in your own words. You do not need to know what the solution is. That is our job.'
            }
            className={`${inputClass} resize-y`}
          />
        )}
      </Field>

      {/* Honeypot. Hidden from people and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="field-website">Website</label>
        <input
          id="field-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={set('website')}
        />
      </div>

      {status === 'error' && (
        <p role="alert" className="rounded-lg border border-hairline bg-paper-raised p-4 text-body-s">
          That did not send. It is us, not you. Try again, or email{' '}
          <a href={`mailto:${site.contact.email}`} className="underline underline-offset-4">
            {site.contact.email}
          </a>{' '}
          directly.
        </p>
      )}

      {status === 'notConfigured' && (
        <p role="alert" className="rounded-lg border border-hairline bg-paper-raised p-4 text-body-s">
          Our form is not connected yet, and that is our fault rather than yours. Please email{' '}
          <a href={`mailto:${site.contact.email}`} className="underline underline-offset-4">
            {site.contact.email}
          </a>{' '}
          and we will pick it up straight away.
        </p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting'
            ? meeting
              ? 'Requesting…'
              : 'Sending…'
            : meeting
              ? 'Request meeting'
              : 'Send message'}
        </Button>
        <p className="text-body-s text-muted">We reply within one working day.</p>
      </div>
    </form>
  );
}
