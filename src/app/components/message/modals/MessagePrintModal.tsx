import { getSender, hasAttachments } from 'proton-shared/lib/mail/messages';
import React, { useEffect } from 'react';
import { FormModal, useContactEmails, useContactGroups } from 'react-components';
import { c } from 'ttag';
import { ContactEmail } from 'proton-shared/lib/interfaces/contacts';
import { noop } from 'proton-shared/lib/helpers/function';

import { MessageExtendedWithData } from '../../../models/message';
import MessageBody from '../MessageBody';
import RecipientsDetails from '../recipients/RecipientsDetails';
import ItemDate from '../../list/ItemDate';
import MessageFooter from '../MessageFooter';
import { getRecipientLabelDetailed } from '../../../helpers/addresses';
import RecipientType from '../recipients/RecipientType';

import './MessagePrint.scss';

interface Props {
    labelID: string;
    message: MessageExtendedWithData;
    onClose?: () => void;
}

const MessagePrintModal = ({ labelID, message, onClose, ...rest }: Props) => {
    const [contacts] = useContactEmails() as [ContactEmail[], boolean, Error];
    const [contactGroups = []] = useContactGroups();
    const sender = getSender(message.data);

    const handlePrint = () => window.print();

    useEffect(() => {
        document.body.classList.add('is-printed-version');
    }, []);

    const handleClose = () => {
        document.body.classList.remove('is-printed-version');
        onClose?.();
    };

    return (
        <FormModal
            title={c('Info').t`Print email`}
            submit={c('Action').t`Print`}
            onEnter={handlePrint}
            onSubmit={handlePrint}
            onClose={handleClose}
            className="pm-modal--wider "
            {...rest}
        >
            <div className="message-print">
                <div className="message-print-header pb1 mb1">
                    <h2 className="message-print-subject bold pb0-5 mb0-5">{message.data?.Subject}</h2>
                    <RecipientType label={c('Label').t`From:`}>
                        {getRecipientLabelDetailed(sender, contacts)}{' '}
                        <span className="opacity-50">&lt;{sender?.Address}&gt;</span>
                    </RecipientType>
                    <RecipientsDetails
                        message={message}
                        contacts={contacts}
                        contactGroups={contactGroups}
                        onCompose={noop}
                        isLoading={false}
                    />
                    <RecipientType label={c('Label').t`Date:`}>
                        <ItemDate element={message.data} labelID={labelID} mode="full" />
                    </RecipientType>
                </div>
                <MessageBody messageLoaded bodyLoaded sourceMode={false} message={message} forceBlockquote />
                {hasAttachments(message.data) ? <MessageFooter message={message} showActions={false} /> : null}
            </div>
        </FormModal>
    );
};

export default MessagePrintModal;
