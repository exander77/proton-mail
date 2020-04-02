import React, { useMemo, useState } from 'react';
import { c } from 'ttag';
import { Location } from 'history';
import {
    Loader,
    useMailSettings,
    useLabels,
    useFolders,
    useConversationCounts,
    useMessageCounts,
    SidebarMenu as CommonSidebarMenu
} from 'react-components';
import { SHOW_MOVED, MAILBOX_LABEL_IDS } from 'proton-shared/lib/constants';
import { redirectTo } from 'proton-shared/lib/helpers/browser';

import { getCounterMap } from '../../helpers/elements';
import { isConversationMode } from '../../helpers/mailSettings';
import SidebarItem from './SidebarItem';
import SidebarGroupHeader from './SidebarGroupHeader';
import SidebarFolders from './SidebarFolders';
import SidebarLabels from './SidebarLabels';

interface Props {
    labelID: string;
    location: Location;
}

const SidebarMenu = ({ labelID: currentLabelID, location }: Props) => {
    const [conversationCounts, loadingConversationCounts] = useConversationCounts();
    const [messageCounts, loadingMessageCounts] = useMessageCounts();
    const [mailSettings, loadingMailSettings] = useMailSettings();
    const [displayFolders, toggleFolders] = useState(true);
    const [displayLabels, toggleLabels] = useState(true);
    const [labels, loadingLabels] = useLabels();
    const [folders, loadingFolders] = useFolders();

    const { ShowMoved } = mailSettings || {};

    const isConversation = isConversationMode(currentLabelID, mailSettings, location);

    const counterMap = useMemo(() => {
        if (!mailSettings || !labels || !folders || !conversationCounts || !messageCounts) {
            return {};
        }

        return getCounterMap(labels.concat(folders), conversationCounts, messageCounts, mailSettings, location);
    }, [mailSettings, labels, folders, conversationCounts, messageCounts]);

    if (loadingMailSettings || loadingLabels || loadingFolders || loadingConversationCounts || loadingMessageCounts) {
        return <Loader />;
    }

    const getCommonProps = (labelID: string) => ({
        currentLabelID,
        labelID,
        isConversation,
        count: counterMap[labelID]
    });

    return (
        <CommonSidebarMenu className="mt0">
            <SidebarItem
                {...getCommonProps(MAILBOX_LABEL_IDS.INBOX)}
                icon="inbox"
                text={c('Link').t`Inbox`}
                isFolder={true}
            />
            <SidebarItem
                {...getCommonProps(
                    ShowMoved & SHOW_MOVED.DRAFTS ? MAILBOX_LABEL_IDS.ALL_DRAFTS : MAILBOX_LABEL_IDS.DRAFTS
                )}
                icon="drafts"
                text={c('Link').t`Drafts`}
                isFolder={true}
            />
            <SidebarItem
                {...getCommonProps(ShowMoved & SHOW_MOVED.SENT ? MAILBOX_LABEL_IDS.ALL_SENT : MAILBOX_LABEL_IDS.SENT)}
                icon="sent"
                text={c('Link').t`Sent`}
                isFolder={true}
            />
            <SidebarItem
                {...getCommonProps(MAILBOX_LABEL_IDS.STARRED)}
                icon="star"
                text={c('Link').t`Starred`}
                isFolder={false}
            />
            <SidebarItem
                {...getCommonProps(MAILBOX_LABEL_IDS.ARCHIVE)}
                icon="archive"
                text={c('Link').t`Archive`}
                isFolder={true}
            />
            <SidebarItem
                {...getCommonProps(MAILBOX_LABEL_IDS.SPAM)}
                icon="spam"
                text={c('Link').t`Spam`}
                isFolder={true}
            />
            <SidebarItem
                {...getCommonProps(MAILBOX_LABEL_IDS.TRASH)}
                icon="trash"
                text={c('Link').t`Trash`}
                isFolder={true}
            />
            <SidebarItem
                {...getCommonProps(MAILBOX_LABEL_IDS.ALL_MAIL)}
                icon="all-emails"
                text={c('Link').t`All mail`}
                isFolder={true}
            />
            <SidebarGroupHeader
                toggled={displayFolders}
                onToggle={() => toggleFolders(!displayFolders)}
                text={c('Link').t`Folders`}
                editText={c('Info').t`Manage your folders`}
                onEdit={() => redirectTo('/settings/labels')}
            />
            {displayFolders && <SidebarFolders currentLabelID={currentLabelID} isConversation={isConversation} />}
            <SidebarGroupHeader
                toggled={displayLabels}
                onToggle={() => toggleLabels(!displayLabels)}
                text={c('Link').t`Labels`}
                editText={c('Info').t`Manage your labels`}
                onEdit={() => redirectTo('/settings/labels')}
            />
            {displayLabels && <SidebarLabels currentLabelID={currentLabelID} isConversation={isConversation} />}
        </CommonSidebarMenu>
    );
};

export default SidebarMenu;