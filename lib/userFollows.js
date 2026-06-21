function normalizeFollowSuggestions(deals = [], follows = [], currentUserId = '') {
  const followedById = new Map(follows.map((follow) => [follow.followed_user_id, follow]));
  const users = new Map();

  for (const deal of deals) {
    if (!deal?.auteur_id || deal.auteur_id === currentUserId) continue;
    if (!users.has(deal.auteur_id)) {
      users.set(deal.auteur_id, {
        id: deal.auteur_id,
        name: deal.auteur_nom || 'Dilz member',
        is_following: followedById.has(deal.auteur_id),
      });
    }
  }

  for (const follow of follows) {
    if (!users.has(follow.followed_user_id)) {
      users.set(follow.followed_user_id, {
        id: follow.followed_user_id,
        name: follow.followed_name || 'Dilz member',
        is_following: true,
      });
    }
  }

  return [...users.values()];
}

function buildFollowerNotifications(deal, follows = []) {
  if (!deal?.id || !deal?.auteur_id) return [];
  const author = deal.auteur_nom || 'A member you follow';
  return follows
    .filter((follow) => follow.follower_id && follow.follower_id !== deal.auteur_id)
    .map((follow) => ({
      alert_id: null,
      deal_id: deal.id,
      user_id: follow.follower_id,
      notification_type: 'follow',
      followed_user_id: deal.auteur_id,
      title: `${author} posted a new Dilz`,
      message: deal.titre || 'Open the new deal',
    }));
}

module.exports = { buildFollowerNotifications, normalizeFollowSuggestions };
