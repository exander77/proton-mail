import React, { memo, useEffect } from 'react';
import { Redirect, useRouteMatch, useHistory, useLocation } from 'react-router-dom';
import {
    ErrorBoundary,
    useMailSettings,
    useUserSettings,
    useLabels,
    useFolders,
    useWelcomeFlags,
    useModals,
} from 'react-components';
import { Label } from 'proton-shared/lib/interfaces/Label';
import { MailSettings, UserSettings } from 'proton-shared/lib/interfaces';

import PrivateLayout from '../components/layout/PrivateLayout';
import MailboxContainer from './MailboxContainer';
import { HUMAN_TO_LABEL_IDS } from '../constants';
import { Breakpoints } from '../models/utils';
import { useLinkHandler } from '../hooks/useLinkHandler';
import { OnCompose } from '../hooks/useCompose';
import { useDeepMemo } from '../hooks/useDeepMemo';
import MailOnboardingModal from '../components/onboarding/MailOnboardingModal';
import { useContactsListener } from '../hooks/useContactsListener';
import { MailUrlParams } from '../helpers/mailboxUrl';

interface Props {
    params: MailUrlParams;
    breakpoints: Breakpoints;
    onCompose: OnCompose;
}

const PageContainer = ({ params: { elementID, labelID, messageID }, breakpoints, onCompose }: Props) => {
    const location = useLocation();
    const history = useHistory();
    const [mailSettings] = useMailSettings() as [MailSettings, boolean, Error];
    const [userSettings] = useUserSettings() as [UserSettings, boolean, Error];

    const { createModal } = useModals();
    const [welcomeFlags, setWelcomeFlagsDone] = useWelcomeFlags();
    useEffect(() => {
        if (welcomeFlags.isWelcomeFlow) {
            createModal(<MailOnboardingModal onClose={setWelcomeFlagsDone} />);
        }
    }, []);

    useLinkHandler(onCompose);
    useContactsListener();

    if (!labelID) {
        return <Redirect to="/inbox" />;
    }

    return (
        <PrivateLayout
            isBlurred={welcomeFlags.isWelcomeFlow}
            labelID={labelID}
            elementID={elementID}
            location={location}
            history={history}
            breakpoints={breakpoints}
            onCompose={onCompose}
        >
            <ErrorBoundary>
                <MailboxContainer
                    labelID={labelID}
                    userSettings={userSettings}
                    mailSettings={mailSettings}
                    breakpoints={breakpoints}
                    elementID={elementID}
                    messageID={messageID}
                    location={location}
                    history={history}
                    onCompose={onCompose}
                />
            </ErrorBoundary>
        </PrivateLayout>
    );
};

const MemoPageContainer = memo(PageContainer);

interface PageParamsParserProps {
    breakpoints: Breakpoints;
    onCompose: OnCompose;
}

const PageParamsParser = (props: PageParamsParserProps) => {
    const [labels = []] = useLabels();
    const [folders = []] = useFolders();
    const match = useRouteMatch<MailUrlParams>();
    const params = useDeepMemo(() => {
        const labelIDs = [...labels, ...folders].map(({ ID }: Label) => ID);
        const { elementID, labelID: currentLabelID = '', messageID } = (match || {}).params || {};
        const labelID = HUMAN_TO_LABEL_IDS[currentLabelID] || (labelIDs.includes(currentLabelID) && currentLabelID);
        return { elementID, labelID, messageID };
    }, [match]);

    return <MemoPageContainer {...props} params={params} />;
};

export default PageParamsParser;
