import { GlassdoorJobsScraper } from './nodes/GlassdoorJobsScraper/GlassdoorJobsScraper.node';
import { ApifyApi } from './credentials/ApifyApi.credentials';

export const nodeTypes = [GlassdoorJobsScraper];

export const credentialTypes = [ApifyApi];
