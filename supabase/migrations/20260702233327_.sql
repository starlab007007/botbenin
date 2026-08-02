DELETE FROM net._http_response WHERE created < now() - interval '2 days';;
