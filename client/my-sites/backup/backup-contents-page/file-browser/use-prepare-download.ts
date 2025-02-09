import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from '@wordpress/element';
import wp from 'calypso/lib/wp';
import { useDispatch } from 'calypso/state';
import { PREPARE_DOWNLOAD_STATUS } from './constants';
import { onPreparingDownloadError } from './notices';

interface PrepareDownloadArgs {
	siteId: number;
	rewindId: string;
	manifestFilter: string;
	dataType: number;
}

interface FilteredPrepareResponse {
	ok: boolean;
	key: string;
}

interface FilteredStatusResponse {
	ok: boolean;
	status: string;
	download_id: string;
	token: string;
	url: string;
}

export const usePrepareDownload = ( siteId: number ) => {
	const dispatch = useDispatch();

	const [ status, setStatus ] = useState( PREPARE_DOWNLOAD_STATUS.NOT_STARTED );
	const [ dataType, setDataType ] = useState( 0 );
	const [ buildKey, setBuildKey ] = useState( '' );

	const handleError = useCallback( () => {
		// Reset the status to not started so that the user can try again.
		setStatus( PREPARE_DOWNLOAD_STATUS.NOT_STARTED );

		// Dispatch an error notice
		dispatch( onPreparingDownloadError() );
	}, [ dispatch ] );

	const { data } = useQuery( {
		queryKey: [ 'jetpack-backup-filtered-status', buildKey, siteId, dataType ],
		queryFn: () =>
			wp.req.post(
				{
					path: `/sites/${ siteId }/rewind/backup/filtered/status`,
					apiNamespace: 'wpcom/v2',
				},
				{
					data_type: dataType,
					key: buildKey,
				}
			),
		enabled: buildKey !== '' && status === PREPARE_DOWNLOAD_STATUS.PREPARING,
		refetchInterval: 5000, // 5 seconds
		retry: false,
		onSuccess: ( data: FilteredStatusResponse ) => {
			if ( data.status === 'ready' ) {
				setStatus( PREPARE_DOWNLOAD_STATUS.READY );
			}
		},
		onError: handleError,
	} );

	const mutation = useMutation( {
		mutationFn: ( { siteId, rewindId, manifestFilter, dataType }: PrepareDownloadArgs ) =>
			wp.req.post(
				{
					path: `/sites/${ siteId }/rewind/backup/filtered/prepare`,
					apiNamespace: 'wpcom/v2',
				},
				{
					backup_id: rewindId,
					manifest_filter: manifestFilter,
					data_type: dataType,
				}
			),
		onSuccess: ( data: FilteredPrepareResponse ) => {
			setBuildKey( data.key );
		},
		onError: handleError,
	} );

	const { mutate } = mutation;

	const prepareDownload = useCallback(
		( siteId: number, rewindId: string, manifestFilter: string, dataType: number ) => {
			setStatus( PREPARE_DOWNLOAD_STATUS.PREPARING );
			setDataType( dataType );
			return mutate( { siteId, rewindId, manifestFilter, dataType } );
		},
		[ mutate ]
	);

	return {
		prepareDownload,
		prepareDownloadStatus: status,
		buildKey,
		downloadUrl: data?.url,
	};
};
