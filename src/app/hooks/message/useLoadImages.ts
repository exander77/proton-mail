import { useCallback } from 'react';
import { useApi, useMailSettings } from 'react-components';

import { MessageExtended } from '../../models/message';
import { useAttachmentCache } from '../../containers/AttachmentProvider';
import { updateMessageCache, useMessageCache } from '../../containers/MessageProvider';
import { transformEmbedded } from '../../helpers/transforms/transformEmbedded';
import { transformRemote } from '../../helpers/transforms/transformRemote';

export const useLoadRemoteImages = (localID: string) => {
    const messageCache = useMessageCache();
    const [mailSettings] = useMailSettings();

    return useCallback(async () => {
        const message = messageCache.get(localID) as MessageExtended;

        transformRemote({ ...message, showRemoteImages: true }, mailSettings);

        updateMessageCache(messageCache, localID, {
            document: message.document,
            showRemoteImages: true
        });
    }, [localID]);
};

export const useLoadEmbeddedImages = (localID: string) => {
    const api = useApi();
    const messageCache = useMessageCache();
    const attachmentsCache = useAttachmentCache();

    return useCallback(async () => {
        const message = messageCache.get(localID) as MessageExtended;

        const { embeddeds } = await transformEmbedded({ ...message, showEmbeddedImages: true }, attachmentsCache, api);

        updateMessageCache(messageCache, localID, {
            document: message.document,
            embeddeds,
            showEmbeddedImages: true
        });
    }, [localID]);
};
