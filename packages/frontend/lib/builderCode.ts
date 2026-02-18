import { Hex, concat, stringToHex } from 'viem';

// Ensure this matches your registered Builder Code from base.dev
// Example: "dailygm_app"
const BUILDER_CODE = "dailygm_app";

export function appendBuilderCode(data: Hex | undefined): Hex {
    const codeHex = stringToHex(BUILDER_CODE);
    return concat([data || '0x', codeHex]);
}
