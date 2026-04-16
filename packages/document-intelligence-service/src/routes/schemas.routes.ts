import { Router } from 'express';

const schemasRouter = Router();

export interface SchemaField {
  key: string;
  description: string;
  required?: boolean;
}

export interface SchemaDefinition {
  id: string;
  name: string;
  description: string;
  fields: SchemaField[];
}

const SCHEMAS: Record<string, SchemaDefinition> = {
  'signin-sheet': {
    id: 'signin-sheet',
    name: 'Sign-In Sheet',
    description: 'Attendee sign-in sheets, event rosters, or participation lists.',
    fields: [
      { key: 'fullName', description: 'Full name of the person', required: true },
      { key: 'phone', description: 'Phone number' },
      { key: 'email', description: 'Email address' },
      { key: 'date', description: 'Date signed up or attended' },
      { key: 'comments', description: 'Any comments or notes' },
    ],
  },
  'business-card': {
    id: 'business-card',
    name: 'Business Card',
    description: 'Standard business cards with contact and company information.',
    fields: [
      { key: 'firstName', description: 'First name', required: true },
      { key: 'lastName', description: 'Last name', required: true },
      { key: 'company', description: 'Company or organization name' },
      { key: 'title', description: 'Job title or role' },
      { key: 'phone', description: 'Phone number' },
      { key: 'email', description: 'Email address' },
      { key: 'website', description: 'Website URL' },
      { key: 'address', description: 'Mailing or street address' },
    ],
  },
  'contact-sheet': {
    id: 'contact-sheet',
    name: 'Contact Sheet',
    description: 'Informal contact lists or directories not formatted as sign-in sheets.',
    fields: [
      { key: 'name', description: 'Full name or contact name', required: true },
      { key: 'phone', description: 'Phone number' },
      { key: 'email', description: 'Email address' },
      { key: 'organization', description: 'Organization or company' },
      { key: 'notes', description: 'Any notes or additional info' },
    ],
  },
};

// GET /schemas  — list all available schemas
schemasRouter.get('/schemas', (_req, res) => {
  const list = Object.values(SCHEMAS).map(({ id, name, description }) => ({ id, name, description }));
  res.json({ count: list.length, schemas: list });
});

// GET /schemas/:id  — fetch one schema
schemasRouter.get('/schemas/:id', (req, res) => {
  const schema = SCHEMAS[req.params.id];
  if (!schema) {
    res.status(404).json({ error: { code: 'SCHEMA_NOT_FOUND', message: `Schema "${req.params.id}" not found.` } });
    return;
  }
  res.json(schema);
});

// GET /schemas/:id/preview  — show expected fields for a schema
schemasRouter.get('/schemas/:id/preview', (req, res) => {
  const schema = SCHEMAS[req.params.id];
  if (!schema) {
    res.status(404).json({ error: { code: 'SCHEMA_NOT_FOUND', message: `Schema "${req.params.id}" not found.` } });
    return;
  }
  const preview = schema.fields.map((f) => ({
    key: f.key,
    description: f.description,
    required: f.required ?? false,
    exampleValue: '',
  }));
  res.json({ id: schema.id, name: schema.name, fields: preview });
});

export { schemasRouter };
