import { MIME_TYPES } from 'proton-shared/lib/constants';
import { MailSettings, Recipient } from 'proton-shared/lib/interfaces';
import React from 'react';
import { fireEvent } from '@testing-library/react';

import { clearAll, render, tick, messageCache } from '../../helpers/test/helper';
import Composer from './Composer';
import { MessageExtended } from '../../models/message';
import { Breakpoints } from '../../models/utils';

// Prevent the actual encrypt and upload attachment
jest.mock('../../helpers/attachment/attachmentUploader', () => {
    return {
        ATTACHMENT_ACTION: {
            ATTACHMENT: 'attachment',
            INLINE: 'inline',
        },
        upload: () => [
            {
                resultPromise: new Promise(() => {
                    // empty
                }),
                addProgressListener: () => {
                    // empty
                },
            },
        ],
        isSizeExceeded: () => false,
    };
});

const ID = 'ID';

const png = new File([], 'file.png', { type: 'image/png' });

const props = {
    index: 0,
    count: 1,
    focus: true,
    message: {},
    mailSettings: {} as MailSettings,
    windowSize: { width: 1000, height: 1000 },
    breakpoints: {} as Breakpoints,
    addresses: [],
    onFocus: jest.fn(),
    onChange: jest.fn(),
    onClose: jest.fn(),
    onCompose: jest.fn(),
};

describe('Composer', () => {
    afterEach(() => clearAll());
    it('should not show embedded modal when plaintext mode', async () => {
        const message = {
            localID: ID,
            initialized: true,
            data: {
                ID,
                MIMEType: 'text/plain' as MIME_TYPES,
                Subject: '',
                ToList: [] as Recipient[],
            },
        } as MessageExtended;
        messageCache.set(ID, message);
        const { getByTestId, queryByText } = await render(<Composer {...props} messageID={ID} />);
        const inputAttachment = getByTestId('composer-attachments-button') as HTMLInputElement;
        fireEvent.change(inputAttachment, { target: { files: [png] } });
        await tick();
        const embeddedModal = queryByText('0 image detected');
        expect(embeddedModal).toBe(null);
        // TODO: Restore that test
        // await findByText('1 file attached');
    });
});
