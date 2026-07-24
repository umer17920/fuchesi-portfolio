'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Field, inputClass } from '@/components/primitives/Field';
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
  preferredTime: '',
  website: '', // honeypot
};

// Native date input min — no requesting a meeting in the past.
const today = new Date().toISOString().slice(0, 10);

export function ContactForm() {
  const [mode, setMode] = useState<Mode>('message');
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setErrors({});
    setStatus('idle');
    // Keep name/email/company; clear the mode-specific fields.
    setValues((v) => ({ ...v, message: '', preferredDate: '', preferredTime: '' }));
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
            preferredDate: values.preferredDate,
            preferredTime: values.preferredTime,
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
        setStatus('success');
        setValues(EMPTY);
        return;
      }
      const data = await res.json().catch(() => ({}));
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
    return (
      <div role="status" className="rounded-lg border border-hairline bg-paper-raised p-8">
        <h2 className="font-display text-display-s">
          {mode === 'meeting' ? 'Meeting requested.' : 'Message sent.'}
        </h2>
        <p className="mt-4 max-w-[52ch] text-body-m text-muted">
          {mode === 'meeting'
            ? 'We have your request and will confirm a time by email within one working day. If it is urgent, WhatsApp us on '
            : 'We read everything that comes in and reply within one working day. If it is urgent, WhatsApp us on '}
          {site.contact.whatsappDisplay}.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 border-b border-hairline pb-1 text-body-s transition-colors duration-300 hover:border-ink"
        >
          {mode === 'meeting' ? 'Request another' : 'Send another'}
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
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Preferred date" name="preferredDate" error={errors.preferredDate}>
            {(p) => (
              <input
                {...p}
                name="preferredDate"
                type="date"
                min={today}
                value={values.preferredDate}
                onChange={set('preferredDate')}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Preferred time" name="preferredTime" error={errors.preferredTime}>
            {(p) => (
              <input
                {...p}
                name="preferredTime"
                type="time"
                value={values.preferredTime}
                onChange={set('preferredTime')}
                className={inputClass}
              />
            )}
          </Field>
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
                : 'Describe the problem in your own words. You do not need to know what the solution is — that is our job.'
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
          That did not send. It is us, not you — try again, or email{' '}
          <a href={`mailto:${site.contact.email}`} className="underline underline-offset-4">
            {site.contact.email}
          </a>{' '}
          directly.
        </p>
      )}

      {status === 'notConfigured' && (
        <p role="alert" className="rounded-lg border border-hairline bg-paper-raised p-4 text-body-s">
          Our form is not connected yet — that is our fault, not yours. Please email{' '}
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
