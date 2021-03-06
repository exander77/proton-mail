import { Attachment } from 'proton-shared/lib/interfaces/mail/Message';
import { RequireSome } from 'proton-shared/lib/interfaces/utils';
import { getAttachments } from 'proton-shared/lib/mail/messages';
import React, { useEffect, useState } from 'react';
import {
    useApi,
    useCalendars,
    useContactEmails,
    useAddresses,
    useLoading,
    useUserSettings,
    useGetCalendarUserSettings,
    useUser,
} from 'react-components';
import { arrayToBinaryString, decodeUtf8 } from 'pmcrypto';
import {
    getCanCreateCalendar,
    getDefaultCalendar,
    getIsCalendarDisabled,
    getProbablyActiveCalendars,
} from 'proton-shared/lib/calendar/calendar';
import isTruthy from 'proton-shared/lib/helpers/isTruthy';
import { Calendar } from 'proton-shared/lib/interfaces/calendar';
import { ContactEmail } from 'proton-shared/lib/interfaces/contacts';
import { useAttachmentCache } from '../../../containers/AttachmentProvider';
import { formatDownload } from '../../../helpers/attachment/attachmentDownloader';
import { EVENT_INVITATION_ERROR_TYPE, EventInvitationError } from '../../../helpers/calendar/EventInvitationError';
import {
    EventInvitation,
    filterAttachmentsForEvents,
    getSupportedEventInvitation,
    parseEventInvitation,
} from '../../../helpers/calendar/invite';

import { MessageExtendedWithData } from '../../../models/message';
import ExtraEvent from './calendar/ExtraEvent';

interface Props {
    message: MessageExtendedWithData;
}
const ExtraEvents = ({ message }: Props) => {
    const cache = useAttachmentCache();
    const [calendars = [], loadingCalendars] = useCalendars();
    const [contactEmails = [], loadingContactEmails] = useContactEmails() as [
        ContactEmail[] | undefined,
        boolean,
        Error
    ];
    const [addresses = [], loadingAddresses] = useAddresses();
    const [user, loadingUser] = useUser();
    const [userSettings, loadingUserSettings] = useUserSettings();
    const getCalendarUserSettings = useGetCalendarUserSettings();
    const [loadingWidget, withLoadingWidget] = useLoading();
    const [invitations, setInvitations] = useState<(RequireSome<EventInvitation, 'method'> | EventInvitationError)[]>(
        []
    );
    const [defaultCalendar, setDefaultCalendar] = useState<Calendar | undefined>();
    const [canCreateCalendar, setCanCreateCalendar] = useState<boolean>(true);
    const api = useApi();
    const loadingConfigs =
        loadingContactEmails || loadingAddresses || loadingCalendars || loadingUserSettings || loadingUser;

    useEffect(() => {
        const attachments = getAttachments(message.data);
        const eventAttachments = filterAttachmentsForEvents(attachments);
        if (!eventAttachments.length) {
            setInvitations([]);
            return;
        }
        if (!message.privateKeys || message.errors?.decryption?.length || loadingConfigs) {
            return;
        }
        let unmounted = false;
        const run = async () => {
            const activeCalendars = getProbablyActiveCalendars(calendars);
            if (calendars.length) {
                const { DefaultCalendarID } = await getCalendarUserSettings();
                if (unmounted) {
                    return;
                }
                setDefaultCalendar(getDefaultCalendar(activeCalendars, DefaultCalendarID));
            }

            const disabledCalendars = calendars.filter((calendar) => getIsCalendarDisabled(calendar));
            if (unmounted) {
                return;
            }
            setCanCreateCalendar(getCanCreateCalendar(activeCalendars, disabledCalendars));
            const invitations = (
                await Promise.all(
                    eventAttachments.map(async (attachment: Attachment) => {
                        try {
                            const download = await formatDownload(attachment, message, cache, api);
                            if (download.isError) {
                                return new EventInvitationError(EVENT_INVITATION_ERROR_TYPE.DECRYPTION_ERROR);
                            }
                            const parsedInvitation = parseEventInvitation(
                                decodeUtf8(arrayToBinaryString(download.data))
                            );
                            if (!parsedInvitation) {
                                return;
                            }
                            return getSupportedEventInvitation(parsedInvitation, message.data);
                        } catch (error) {
                            if (error instanceof EventInvitationError) {
                                return error;
                            }
                            return new EventInvitationError(EVENT_INVITATION_ERROR_TYPE.INVITATION_INVALID, error);
                        }
                    })
                )
            ).filter(isTruthy);
            if (unmounted) {
                return;
            }
            setInvitations(invitations);
        };

        void withLoadingWidget(run());

        return () => {
            unmounted = true;
        };
    }, [message.data, message.privateKeys, message.errors, loadingConfigs]);

    if (loadingConfigs || loadingWidget) {
        return null;
    }

    return (
        <>
            {invitations.map((invitation, index: number) => {
                return (
                    <ExtraEvent
                        key={index} // eslint-disable-line react/no-array-index-key
                        invitationOrError={invitation}
                        message={message}
                        calendars={calendars}
                        defaultCalendar={defaultCalendar}
                        canCreateCalendar={canCreateCalendar}
                        contactEmails={contactEmails}
                        ownAddresses={addresses}
                        user={user}
                        userSettings={userSettings}
                    />
                );
            })}
        </>
    );
};

export default ExtraEvents;
