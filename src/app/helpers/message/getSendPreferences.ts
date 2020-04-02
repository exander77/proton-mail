import { EncryptionPreferences } from 'proton-shared/lib/mail/encryptionPreferences';
import { Message } from '../../models/message';
import { isSign } from './messages';
import { getMimeType, getPGPScheme, SendPreferences } from './sendPreferences';

/**
 * Get the send preferences for sending a message based on the encryption preferences
 * for sending to an email address, and the message preferences.
 */
const getSendPreferences = (encryptionPreferences: EncryptionPreferences, message?: Message): SendPreferences => {
    const { encrypt, sign, publicKey, isPublicKeyPinned, hasApiKeys, hasPinnedKeys, warnings } = encryptionPreferences;
    // override sign if necessary
    // (i.e. when the contact sign preference is false and the user toggles "Sign" on the composer)
    const newSign = sign || isSign(message);
    // cast PGP scheme into what API expects. Override if necessary
    const pgpScheme = getPGPScheme(encryptionPreferences, message);
    // use message MIME type if no MIME type has been specified
    const newMimeType = getMimeType(encryptionPreferences, message);

    return {
        encrypt,
        sign: newSign,
        pgpScheme,
        mimetype: newMimeType,
        publicKeys: publicKey ? [publicKey] : undefined,
        isPublicKeyPinned,
        hasApiKeys,
        hasPinnedKeys,
        warnings
    };
};

export default getSendPreferences;