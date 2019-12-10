---
layout: post
title: Recipes
---

{% for post in site.posts %}
-[{{ post.title }}]({{ post.url }})
{% endfor %}

