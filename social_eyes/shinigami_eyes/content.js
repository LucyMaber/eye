// content.js
// (Extracted and adapted from the extension’s content.js)
// Exports helper functions to parse URLs and extract an “identifier”
function domainIs(host, baseDomain) {
    if (baseDomain.length > host.length)
      return false;
    if (baseDomain.length === host.length)
      return baseDomain === host;
    const k = host.charCodeAt(host.length - baseDomain.length - 1);
    if (k === 0x2E /* . */)
      return host.endsWith(baseDomain);
    else
      return false;
  }
  
  function getPartialPath(path, num) {
    let m = path.split('/');
    m = m.slice(1, 1 + num);
    if (m.length && !m[m.length - 1])
      m.length--;
    if (m.length !== num)
      return '!!';
    return '/' + m.join('/');
  }
  
  function getPathPart(path, index) {
    return path.split('/')[index + 1] || null;
  }
  
  function captureRegex(str, regex) {
    if (!str) return null;
    const match = str.match(regex);
    if (match && match[1]) return match[1];
    return null;
  }
  
  function tryParseURL(urlstr) {
    if (!urlstr) return null;
    try {
      const url = new URL(urlstr);
      if (url.protocol !== 'http:' && url.protocol !== 'https:')
        return null;
      return url;
    } catch (e) {
      return null;
    }
  }
  
  function tryUnwrapNestedURL(url) {
    if (!url) return null;
    if (domainIs(url.host, 'youtube.com') && url.pathname === '/redirect') {
      const q = url.searchParams.get('q');
      if (q && !q.startsWith('http:') && !q.startsWith('https:') && q.includes('.'))
        return tryParseURL('http://' + q);
    }
    if (url.href.indexOf('http', 1) !== -1) {
      if (url.pathname.startsWith('/intl/'))
        return null; // facebook language switch links
      const values = url.search.split('&').map(x => {
        if (x.startsWith('ref_url=')) return '';
        const eq = x.indexOf('=');
        return eq === -1 ? '' : decodeURIComponent(x.substr(eq + 1));
      });
      for (const value of values) {
        if (value.startsWith('http:') || value.startsWith('https:')) {
          return tryParseURL(value);
        }
      }
      const newurl = tryParseURL(url.href.substring(url.href.indexOf('http', 1)));
      if (newurl)
        return newurl;
    }
    return null;
  }
  
  function tryUnwrapSuffix(str, suffix) {
    return str && str.endsWith(suffix) ? str.substring(0, str.length - suffix.length) : null;
  }
  
  function tryUnwrapPrefix(str, prefix) {
    return str && str.startsWith(prefix) ? str.substring(prefix.length) : null;
  }
  
  function getIdentifierFromURLIgnoreBridges(url) {
    if (!url) return null;
    const nested = tryUnwrapNestedURL(url);
    if (nested) {
      return getIdentifierFromURLImpl(nested);
    }
    if (url.pathname.includes('/badge_member_list/'))
      return null;
    let host = url.hostname;
    const searchParams = url.searchParams;
    if (host.startsWith('www.'))
      host = host.substring(4);
    const pathArray = url.pathname.split('/');
    if (domainIs(host, 'bsky.social') || domainIs(host, 'bsky.app')) {
      let username = null;
      if (pathArray[3] === 'lists')
        return null;
      if (pathArray[3] === 'feed')
        return null;
      if (pathArray[1] === 'profile') {
        username = pathArray[2];
        if (username.startsWith('@'))
          username = username.substring(1);
      } else if (url.pathname.startsWith('/@')) {
        username = pathArray[1].substring(1);
      } else if (host.includes('.bsky.')) {
        username = captureRegex(host, /^(.+)\.bsky/);
      }
      return username ? (username.includes('.') ? username : username + '.bsky.social') : null;
    }
    if (domainIs(host, 'facebook.com')) {
      const fbId = searchParams.get('id');
      const p = url.pathname.replace('/pg/', '/');
      const isGroup = p.startsWith('/groups/');
      return 'facebook.com/' + (fbId || getPartialPath(p, isGroup ? 2 : 1).substring(1));
    }
    else if (domainIs(host, 'reddit.com')) {
      const pathname = url.pathname.replace('/u/', '/user/');
      if (!pathname.startsWith('/user/') && !pathname.startsWith('/r/'))
        return null;
      if (pathname.includes('/comments/') && host === 'reddit.com')
        return null;
      return 'reddit.com' + getPartialPath(pathname, 2);
    }
    else if (domainIs(host, 'twitter.com') || domainIs(host, 'x.com')) {
      return 'twitter.com' + getPartialPath(url.pathname, 1);
    }
    else if (domainIs(host, 'youtube.com')) {
      const pathname = url.pathname;
      if (pathname.startsWith('/user/') || pathname.startsWith('/c/') || pathname.startsWith('/channel/'))
        return 'youtube.com' + getPartialPath(pathname, 2);
      return 'youtube.com' + getPartialPath(pathname, 1);
    }
    else if (domainIs(host, 'disqus.com') && url.pathname.startsWith('/by/')) {
      return 'disqus.com' + getPartialPath(url.pathname, 2);
    }
    else if (domainIs(host, 'medium.com')) {
      const hostParts = host.split('.');
      if (hostParts.length === 3 && hostParts[0] !== 'www') {
        return host;
      }
      return 'medium.com' + getPartialPath(url.pathname.replace('/t/', '/'), 1);
    }
    else if (domainIs(host, 'tumblr.com')) {
      if (url.pathname.startsWith('/register/follow/')) {
        const name = getPathPart(url.pathname, 2);
        return name ? name + '.tumblr.com' : null;
      }
      if (url.pathname.includes('/tagged/'))
        return null;
      if (host === 'tumblr.com' || host === 'at.tumblr.com') {
        let name = getPathPart(url.pathname, 0);
        if (!name) return null;
        if (name === 'blog')
          name = getPathPart(url.pathname, 1);
        if (['new', 'dashboard', 'explore', 'inbox', 'likes', 'following', 'settings', 'changes', 'help', 'about', 'apps', 'policy', 'post', 'search', 'tagged'].includes(name))
          return null;
        if (name.startsWith('@'))
          name = name.substring(1);
        return name + '.tumblr.com';
      }
      if (host !== 'tumblr.com' && host !== 'assets.tumblr.com' && host.indexOf('.media.') === -1) {
        return url.host;
      }
      return null;
    }
    else if (domainIs(host, 'wikipedia.org') || domainIs(host, 'rationalwiki.org')) {
      const pathname = url.pathname;
      if (url.hash)
        return null;
      if (pathname === '/w/index.php' && searchParams.get('action') === 'edit') {
        const title = searchParams.get('title');
        if (title && title.startsWith('User:')) {
          return 'wikipedia.org/wiki/' + title;
        }
      }
      if (pathname.startsWith('/wiki/Special:Contributions/') && url.href === url.href)
        return 'wikipedia.org/wiki/User:' + pathArray[3];
      if (pathname.startsWith('/wiki/User:') && !pathArray[3])
        return 'wikipedia.org/wiki/User:' + pathArray[2].split(':')[1];
      if (pathname.startsWith('/wiki/User_talk:') && !pathArray[3])
        return 'wikipedia.org/wiki/User:' + pathArray[2].split(':')[1];
      if (pathname.includes(':'))
        return null;
      if (pathname.startsWith('/wiki/'))
        return 'wikipedia.org' + decodeURIComponent(getPartialPath(pathname, 2));
      else
        return null;
    }
    else if (host.indexOf('.blogspot.') !== -1) {
      const m = captureRegex(host, /([a-zA-Z0-9\-]*)\.blogspot/);
      if (m)
        return m + '.blogspot.com';
      else
        return null;
    }
    else if (host.includes('google.')) {
      if (url.pathname === '/search' && searchParams.get('stick') && !searchParams.get('tbm') && !searchParams.get('start')) {
        const q = searchParams.get('q');
        if (q)
          return 'wikipedia.org/wiki/' + q.replace(/\s/g, '_');
      }
      return null;
    }
    else if (domainIs(host, 'cohost.org')) {
      return 'cohost.org' + getPartialPath(url.pathname, 1);
    }
    else {
      if (host.startsWith('m.'))
        host = host.substr(2);
      if (url.pathname.startsWith('/@') || url.pathname.startsWith('/web/@')) {
        let username = getPathPart(url.pathname, 0);
        if (username === null) return host;
        username = username.substring(1);
        const parts = username.split('@');
        if (parts.length === 2)
          return parts[1] + '/@' + parts[0];
        if (parts.length === 1 && username)
          return host + '/@' + username;
      }
      if (url.pathname.startsWith('/users/')) {
        let username = getPathPart(url.pathname, 1);
        if (username)
          return host + '/@' + username;
      }
      return host;
    }
  }
  
  function getIdentifierFromURLImpl(url) {
    return getIdentifierFromURLIgnoreBridges(url);
  }
  
  module.exports = {
    getIdentifierFromURLImpl,
    domainIs,
    tryParseURL,
    captureRegex,
    getPartialPath,
    getPathPart
  };
  