import { c } from 'ttag';
import { encryptMessage, splitMessage, PmcryptoKey } from 'pmcrypto';

import { MessageExtended } from '../../models/message';
import { Api, Binary } from '../../models/utils';
import { getAttachments } from '../message/messages';
import { readFileAsBuffer } from '../file';
import { uploadAttachment } from '../../api/attachments';
import { isEmbeddable, getCid } from './attachments';
import { Attachment } from '../../models/attachment';
import { MIME_TYPES } from 'proton-shared/lib/constants';
import { store } from '../embedded/embeddedStoreBlobs';
import { generateCid } from '../embedded/embeddedUtils';
import { generateUID } from '../string';

// Reference: Angular/src/app/attachments/factories/attachmentModel.js

type UploadQueryResult = Promise<{ Attachment: Attachment }>;

export enum ATTACHMENT_ACTION {
    ATTACHMENT = 'attachment',
    INLINE = 'inline'
}

interface Packets {
    Filename: string;
    MIMEType: MIME_TYPES;
    FileSize: number;
    Inline: boolean;
    signature?: Uint8Array;
    Preview: Uint8Array;
    keys: Uint8Array;
    data: Uint8Array;
}

interface UploadResult {
    attachment: Attachment;
    // sessionKey: SessionKey;
    packets: Packets;
    // cid: string;
    // REQUEST_ID: string;
}

const encrypt = async (
    data: Binary,
    { name, type, size }: File = {} as File,
    inline: boolean,
    publicKeys: PmcryptoKey[],
    privateKeys: PmcryptoKey[]
): Promise<Packets> => {
    const { message, signature } = await encryptMessage({
        filename: name,
        armor: false,
        detached: true,
        data,
        publicKeys,
        privateKeys
    });

    const { asymmetric, encrypted } = await splitMessage(message);

    return {
        Filename: name,
        MIMEType: type as MIME_TYPES,
        FileSize: size,
        Inline: inline,
        signature: signature ? (signature.packets.write() as Uint8Array) : undefined,
        Preview: data,
        keys: asymmetric[0],
        data: encrypted[0]
    };
};

/**
 * Read the file locally, and encrypt it. return the encrypted file.
 */
const encryptFile = async (file: File, inline: boolean, pubKeys: PmcryptoKey[], privKey: PmcryptoKey[]) => {
    if (!file) {
        throw new TypeError(c('Error').t`You did not provide a file.`);
    }
    try {
        const result = await readFileAsBuffer(file);
        return encrypt(new Uint8Array(result), file, inline, pubKeys, privKey);
    } catch (e) {
        throw new Error(c('Error').t`Failed to encrypt attachment. Please try again.`);
    }
};

/**
 * Add a new attachment, upload it to the server
 */
const uploadFile = async (
    file: File,
    message: MessageExtended,
    inline: boolean,
    api: Api,
    total = 1,
    cid = ''
): Promise<UploadResult> => {
    const titleImage = c('Title').t`Image`;

    // const tempPacket = {
    //     filename: file.name || `${titleImage} ${getAttachments(message.data).length + 1}`,
    //     uploading: true,
    //     Size: file.size,
    //     ContentID: cid
    // };

    const filename = file.name || `${titleImage} ${getAttachments(message.data).length + 1}`;
    const ContentID = inline ? cid || generateCid(generateUID(), message.data?.Sender?.Address || '') : '';

    const publicKeys = message.publicKeys && message.publicKeys.length > 0 ? [message.publicKeys[0]] : [];

    // console.log('uploadFile', file, inline, publicKeys, message.privateKeys || []);

    const packets = await encryptFile(file, inline, publicKeys, message.privateKeys || []);

    const { Attachment } = await (api(
        uploadAttachment({
            Filename: packets.Filename || filename,
            MessageID: message.data?.ID || '',
            ContentID,
            MIMEType: packets.MIMEType,
            KeyPackets: new Blob([packets.keys] as any),
            DataPacket: new Blob([packets.data] as any),
            Signature: packets.signature ? new Blob([packets.signature] as any) : undefined
        })
    ) as UploadQueryResult);

    console.log('result', total, Attachment);

    // TODO
    // if (isAborted) {
    //     return;
    // }

    // Extract content-id even if there are no headers
    // const contentId = `${(Attachment.Headers || {})['content-id'] || ''}`;
    // const newCid = contentId.replace(/[<>]+/g, '');

    // return { attachment, sessionKey, packets, cid: newCid, REQUEST_ID };
    return { attachment: Attachment, packets };
};

// const getNewCid = (attachment: Attachment) => {
//     const contentId = `${(attachment.Headers || {})['content-id'] || ''}`;
//     return contentId.replace(/[<>]+/g, '');
// };

/**
 * Upload a list of attachments [...File]
 */
export const upload = async (
    files: File[] = [],
    message: MessageExtended = {},
    action = ATTACHMENT_ACTION.ATTACHMENT,
    api: Api,
    // triggerEvent = true,
    cid = ''
) => {
    const uploads = await Promise.all(
        files.map((file) => {
            const inline = isEmbeddable(file.type) && action === ATTACHMENT_ACTION.INLINE;
            return uploadFile(file, message, inline, api, files.length, cid);
        })
    );

    // message.uploading = promises.length;
    // message.encryptingAttachment = true;
    // dispatchMessageAction(message);

    // const cleanUploads = uploads.filter(Boolean) as {
    //     attachment: Attachment;
    //     sessionKey: any;
    //     packets: any;
    //     cid: string;
    //     REQUEST_ID: string;
    // }[]; // will be undefined for aborted request

    // message.uploading = 0;
    // message.encryptingAttachment = false;
    // dispatchMessageAction(message);

    // TODO: Embedded
    // Create embedded and replace theses files from the upload list
    uploads.forEach(({ attachment, packets }) => {
        // addEmbedded(message, cid, packets.Preview, attachment.MIMEType);
        console.log('store', getCid(attachment));
        store(message.data, getCid(attachment))(packets.Preview, attachment.MIMEType);
    });
    // const embeddedMap = addEmbedded(upload, message);
    // return _.map(upload, (config) => {
    //     return embeddedMap[config.attachment.ID] || config;
    // });

    // .then((upload) => {
    //     message.addAttachments(upload.map(({ attachment }) => attachment));
    //     updateMapAttachments(upload);

    //     if (triggerEvent && upload.length) {
    //         dispatch('upload.success', { upload, message, messageID: message.ID });
    //     }
    //     return upload;
    // }).catch((err) => {
    //     dispatchMessageAction(message);
    //     throw err;
    // });

    // TODO
    // const promise = composerRequestModel.add(message, callback);
    // networkActivityTracker.track(promise);

    return uploads;
};
