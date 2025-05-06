import {NextRequest} from 'next/server';
import {createNextHandler} from '@genkit-ai/next';

// We must export all flows that we want to be publicly accessible
import '@/ai/dev';

// By default, Next.js only exposes GET and POST methods to Genkit flows.
// To add more methods, you can specify them like this:
// export const { GET, POST, PUT, DELETE } = createNextHandler();
export const {POST} = createNextHandler();
